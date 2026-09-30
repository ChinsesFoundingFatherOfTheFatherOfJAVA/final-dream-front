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
        <img v-if="cover" :src="cover" alt="" />
        <div class="preview-placeholder" :style="cover ? {} : { background: '#30384a' }"></div>
        <button type="button" aria-label="播放预览" @click.stop>
          <span>▶</span>
        </button>
      </section>
      <section class="caption-panel">
        <nav>
          <button
            v-for="item in languages"
            :key="item.value"
            type="button"
            :class="{ active: language === item.value }"
            @click="language = item.value"
          >
            {{ item.label }}
          </button>
        </nav>
        <div class="caption-empty">
          <div>字幕生成功能建设中</div>
          <p>后续接入 AI 字幕后将在此展示时间戳与字幕文本</p>
        </div>
      </section>
    </div>

    <template #footer>
      <button type="button" class="btn" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" @click="save">保存</button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import KngDrawer from '../../components/KngDrawer.vue'
import { resolveAssetUrl } from '@/api/request'
import type { CoursewareListItem } from '@/api/courseware'
import { toast } from '@/utils/toast'

const props = defineProps<{
  visible: boolean
  courseware: CoursewareListItem | null
}>()

const emit = defineEmits<{ close: [] }>()
const language = ref('zh')
const languages = [
  { value: 'zh', label: '简体中文' },
  { value: 'tw', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' }
]
const cover = computed(() => resolveAssetUrl(props.courseware?.coverUrl))

function save() {
  toast.info('字幕生成功能建设中')
}
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

  img,
  .preview-placeholder {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  > button {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%);
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 50%;
    background: rgba(20, 28, 42, 0.45);
    color: #fff;
    cursor: not-allowed;
  }
}

.caption-panel nav {
  display: flex;
  align-items: center;
  gap: 34px;
  border-bottom: 1px solid #e7ebf2;

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

.caption-empty {
  padding-top: 130px;
  color: #7b8496;
  text-align: center;

  div {
    color: #4d5568;
    font-size: 15px;
  }

  p {
    margin: 10px 0 0;
    font-size: 12px;
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
  }
}
</style>
