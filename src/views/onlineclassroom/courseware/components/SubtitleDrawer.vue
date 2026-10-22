<template>
  <KngDrawer
    :visible="visible"
    title="编辑字幕"
    :width="920"
    :z-index="4100"
    @close="emit('close')"
  >
    <div class="subtitle-body">
      <section class="preview">
        <!-- MT-06：hls.js 播转码产物 m3u8；转码未完成（play 接口 code=1）时显示"暂无可播放内容"空态 -->
        <video v-show="playUrl && hlsState === 'ready'" ref="videoRef" controls playsinline></video>
        <div
          v-if="!playUrl"
          class="preview-empty"
          :style="cover ? { background: `url(${cover}) center/cover` } : {}"
        >
          <span>暂无可播放内容</span>
        </div>
        <div v-else-if="hlsState === 'error'" class="preview-empty">
          <span>播放组件未安装或浏览器不支持 HLS，无法预览</span>
        </div>
      </section>
      <section class="caption-panel">
        <div class="panel-toolbar">
          <nav>
            <el-button
              v-for="item in languages"
              :key="item.value"
             
              :class="{ active: language === item.value }"
              @click="switchLanguage(item.value)"
            >
              {{ item.label }}
            </el-button>
          </nav>
          <!-- MT-05 右上角【重新生成字幕】：二次确认"将覆盖现有字幕"后重投 subtitle job -->
          <el-button class="regen-btn" :disabled="regenerating" @click="regenerate">
            {{ subtitlesFlag ? '重新生成字幕' : '生成字幕' }}
          </el-button>
        </div>

        <div v-if="!subtitlesFlag" class="caption-empty">
          <div>尚未生成字幕</div>
          <p>开启 AI 字幕后可一键生成四语言字幕</p>
          <el-button class="btn primary" :disabled="regenerating" @click="regenerate">
            生成字幕
          </el-button>
        </div>

        <template v-else>
          <div v-if="!entries.length" class="caption-empty">
            <div>该语言暂无字幕</div>
            <p>可切换其他语言标签查看</p>
          </div>
          <!-- 字幕条目列表：index + 时间段(mm:ss 显示，毫秒保留在原始值里入参) + 文本 + 行内编辑 -->
          <ul v-else class="entry-list">
            <li v-for="(entry, position) in entries" :key="entry.index">
              <span class="entry-no">{{ entry.index }}</span>
              <span class="entry-time"
                >{{ shortTime(entry.beginTime) }}→{{ shortTime(entry.endTime) }}</span
              >
              <template v-if="editingPosition === position">
                <el-input
                  v-model="editingText"
                  class="entry-input"
                  @keyup.enter="commitEdit"
                  @blur="commitEdit"
                />
              </template>
              <span v-else class="entry-text" :title="entry.text">{{ entry.text }}</span>
              <el-button
                v-if="editingPosition !== position"
               
                class="edit-btn"
                aria-label="编辑"
                @click="startEdit(position)"
              >
                ✎
              </el-button>
            </li>
          </ul>
        </template>
      </section>
    </div>

    <template #footer>
      <el-button class="btn" @click="emit('close')">取消</el-button>
      <!-- 保存=当前语言整份 PUT（FP-MT-05b）；字幕 job 活跃中后端 code=1 拦截器统一 toast"字幕生成中，稍后保存" -->
      <el-button
        class="btn primary"
        :disabled="saving || !subtitlesFlag || !entries.length"
        @click="save"
      >
        保存
      </el-button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import KngDrawer from '../../components/KngDrawer.vue'
import { resolveAssetUrl } from '@/api/request'
import type { CoursewareListItem } from '@/api/courseware'
import {
  getPlayUrl,
  getSubtitles,
  regenerateSubtitles,
  saveSubtitles,
  type SubtitleEntry,
} from '@/api/media'
import { toast } from '@/utils/toast'

const props = defineProps<{
  visible: boolean
  courseware: CoursewareListItem | null
}>()

const emit = defineEmits<{ close: [] }>()

/** 语言 tab 与 SRT 文件名一一对应（03 §2：zh/ha/en/vi，繁体是 qwen 真翻译对应 ha.srt） */
const languages = [
  { value: 'zh', label: '简体中文' },
  { value: 'ha', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
] as const
type Lang = (typeof languages)[number]['value']

const language = ref<Lang>('zh')
const subtitlesFlag = ref(false)
const entriesByLang = ref<Partial<Record<Lang, SubtitleEntry[]>>>({})
const entries = computed<SubtitleEntry[]>(
  () => entriesByLang.value[language.value]?.slice().sort((a, b) => a.index - b.index) ?? [],
)

const playUrl = ref('')
const hlsState = ref<'idle' | 'ready' | 'error'>('idle')
const videoRef = ref<HTMLVideoElement | null>(null)
// hls.js 实例句柄：dynamic import 拿到的是具体类型难以静态引用，用结构化最小接口承载 destroy
let hlsInstance: { destroy: () => void } | null = null

const cover = computed(() => resolveAssetUrl(props.courseware?.coverUrl))

const editingPosition = ref<number | null>(null)
const editingText = ref('')
const saving = ref(false)
const regenerating = ref(false)

/** 标准时间戳 "HH:MM:SS,mmm" → "mm:ss" 级显示（毫秒保留在原始数据，保存时不丢） */
function shortTime(timestamp: string) {
  const matched = /^(\d{1,2}):(\d{2}):(\d{2})/.exec(timestamp)
  if (!matched) return timestamp
  const hours = Number(matched[1])
  const minutes = Number(matched[2])
  const seconds = matched[3]
  const totalMinutes = hours * 60 + minutes
  return `${String(totalMinutes).padStart(2, '0')}:${seconds}`
}

function switchLanguage(value: Lang) {
  language.value = value
  editingPosition.value = null
}

// ---------- 数据加载 ----------
async function loadAll() {
  const id = props.courseware?.id
  if (!id) return
  // play 接口 silent：code=1"暂无可播放内容"由预览区空态呈现，不弹全局 toast
  try {
    const play = await getPlayUrl(id, { silent: true })
    playUrl.value = play.playUrl
  } catch {
    playUrl.value = ''
  }
  try {
    const data = await getSubtitles(id)
    subtitlesFlag.value = data.subtitlesFlag
    entriesByLang.value = {
      zh: data.entries.zh ?? [],
      ha: data.entries.ha ?? [],
      en: data.entries.en ?? [],
      vi: data.entries.vi ?? [],
    }
  } catch {
    subtitlesFlag.value = false
    entriesByLang.value = {}
  }
  if (playUrl.value) void setupPlayer(playUrl.value)
}

/**
 * hls.js 播放：动态 import（安装失败/加载失败时降级提示"播放组件未安装"，不阻塞抽屉其余功能）。
 * Safari 原生支持 HLS 时直接 src 播放，不走 hls.js。
 */
async function setupPlayer(src: string) {
  const video = videoRef.value
  if (!video) return
  const url = resolveAssetUrl(src)
  try {
    const mod = await import('hls.js')
    const Hls = mod.default
    if (Hls.isSupported()) {
      hlsInstance?.destroy()
      const hls = new Hls()
      hls.loadSource(url)
      hls.attachMedia(video)
      hlsInstance = hls
      hlsState.value = 'ready'
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      hlsState.value = 'ready'
    } else {
      hlsState.value = 'error'
    }
  } catch {
    hlsState.value = 'error'
  }
}

// ---------- 行内编辑 ----------
function startEdit(position: number) {
  editingPosition.value = position
  editingText.value = entries.value[position]?.text ?? ''
}

/** 失焦/回车提交：仅改本地，点【保存】才整语言 PUT（对齐 01 验收"编辑第 5 条→保存后重开可见"） */
function commitEdit() {
  const position = editingPosition.value
  if (position === null) return
  const list = entriesByLang.value[language.value]
  const target = list?.find((item) => item.index === entries.value[position]?.index)
  if (target) target.text = editingText.value.trim()
  editingPosition.value = null
}

// ---------- 保存 / 重新生成 ----------
async function save() {
  const id = props.courseware?.id
  if (!id) return
  saving.value = true
  try {
    await saveSubtitles(id, language.value, entries.value)
    toast.info('字幕已保存')
    emit('close')
  } finally {
    saving.value = false
  }
}

/** 生成/重新生成字幕（FP-MT-05c）：重投 subtitle job；已有活跃 job 时后端 code=1 拦截器统一提示 */
async function regenerate() {
  const id = props.courseware?.id
  if (!id) return
  if (subtitlesFlag.value && !(await confirmDialog({ message: '将覆盖现有字幕，确定重新生成吗？' }))) return
  regenerating.value = true
  try {
    await regenerateSubtitles(id)
    toast.info('字幕生成任务已提交，生成完成后可重新打开查看')
    emit('close')
  } finally {
    regenerating.value = false
  }
}

// ---------- 生命周期 ----------
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      language.value = 'zh'
      editingPosition.value = null
      hlsState.value = 'idle'
      void loadAll()
      // 可选增强（02 §5）：抽屉打开期间每 10s silent 轮询字幕状态，便于感知生成完成并刷新列表。
      // 当前提交生成后即关闭抽屉，轮询收益有限，故仅保留挂载期一次加载 + 用户手动重开刷新。
    } else {
      hlsInstance?.destroy()
      hlsInstance = null
      playUrl.value = ''
    }
  },
)
</script>

<style scoped lang="scss">
.subtitle-body {
  min-height: 540px;
  display: grid;
  grid-template-columns: minmax(340px, 44%) 1fr;
  gap: 42px;
}

.preview {
  position: relative;
  height: 360px;
  overflow: hidden;
  border-radius: 3px;
  background: #111827;

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }
}

.preview-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #30384a;
  color: #aab3c4;
  font-size: 13px;
}

.panel-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e7ebf2;

  nav {
    display: flex;
    align-items: center;
    gap: 24px;

    button {
      position: relative;
      height: 42px;
      padding: 0;
      border: none;
      background: transparent;
      color: #687386;
      font-size: 14px;
      cursor: pointer;

      &.active {
        color: #2e7cf6;

        &::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 2px;
          background: #2e7cf6;
        }
      }
    }
  }
}

.regen-btn {
  height: 30px;
  margin-bottom: 7px;
  padding: 0 12px;
  border: 1px solid #d9deea;
  border-radius: 5px;
  background: #fff;
  color: #4d5568;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    color: #c2c8d2;
    cursor: not-allowed;
  }
}

.caption-empty {
  padding-top: 120px;
  color: #7b8496;
  text-align: center;

  div {
    color: #4d5568;
    font-size: 15px;
  }

  p {
    margin: 10px 0 18px;
    font-size: 12px;
  }
}

.entry-list {
  max-height: 480px;
  margin: 0;
  padding: 6px 0;
  overflow-y: auto;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 4px 2px;
    border-bottom: 1px solid #f1f4f8;
    font-size: 13px;
  }
}

.entry-no {
  width: 26px;
  flex-shrink: 0;
  color: #98a1b2;
  text-align: right;
}

.entry-time {
  flex-shrink: 0;
  color: #687386;
  font-family: Consolas, monospace;
}

.entry-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #394253;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #2e7cf6;
  border-radius: 4px;
  outline: none;
  color: #394253;
  font-size: 13px;
}

.edit-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #98a1b2;
  cursor: pointer;

  &:hover {
    color: #2e7cf6;
  }
}

.btn {
  height: 36px;
  padding: 0 20px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  cursor: pointer;

  &.primary {
    border-color: #2e7cf6;
    background: #2e7cf6;
    color: #fff;

    &:disabled {
      border-color: #c2c8d2;
      background: #c2c8d2;
      cursor: not-allowed;
    }
  }
}
</style>
