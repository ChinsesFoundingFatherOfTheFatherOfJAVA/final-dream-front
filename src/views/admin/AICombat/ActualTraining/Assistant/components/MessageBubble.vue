<template>
  <div class="message-row" :class="message.role === 'user' ? 'row-user' : 'row-agent'">
    <div v-if="message.role === 'agent'" class="avatar">🤖</div>

    <div class="bubble-wrap">
      <!-- 助手：段落按 markdown 渲染（含表格）；用户：纯文本气泡 -->
      <template v-for="(block, i) in message.blocks" :key="i">
        <div v-if="block.kind === 'text'" class="bubble" :class="message.role === 'user' ? 'bubble-user' : 'bubble-agent'">
          <div
            v-if="message.role === 'agent'"
            class="md-body"
            v-html="renderMarkdown(block.text)"
          ></div>
          <template v-else>
            <span class="user-text">{{ block.text }}</span>
          </template>
          <span v-if="message.streaming && isLastBlock(i)" class="typing-caret">▍</span>
        </div>

        <!-- 文件消息卡（用户上传） -->
        <div v-else-if="block.kind === 'file'" class="file-card">
          <span class="file-icon">{{ fileIcon(block.fileType) }}</span>
          <div class="file-meta">
            <div class="file-name">{{ block.name }}</div>
            <div class="file-sub">{{ block.fileType.toUpperCase() }} · {{ formatSize(block.fileSize) }}</div>
          </div>
        </div>

        <!-- 事件卡（data 块按 bizType 渲染） -->
        <div v-else class="event-card" :class="eventCardClass(block)">
          <!-- 解析中（contentType=data 但尚未 part-end，或 JSON 解析失败） -->
          <template v-if="!block.done">
            <div class="event-head">
              <span class="spinner"></span>
              <span class="event-title">正在处理…</span>
            </div>
          </template>
          <template v-else-if="block.parseError">
            <div class="event-head">
              <span class="event-icon">⚠️</span>
              <span class="event-title">事件解析失败</span>
            </div>
            <pre class="event-raw">{{ block.raw }}</pre>
          </template>

          <!-- biz-common-parse-file：解析中 → 解析完成 两态 -->
          <template v-else-if="block.bizType === 'biz-common-parse-file'">
            <div class="event-head">
              <span v-if="parseDone(block)" class="event-icon ok">✓</span>
              <span v-else class="spinner"></span>
              <span class="event-title">{{ parseDone(block) ? '文件解析完成' : '正在解析文件…' }}</span>
            </div>
            <ul class="event-files">
              <li v-for="f in parseFiles(block)" :key="f.id">
                <span class="file-icon sm">📄</span>
                <span class="file-item-name">{{ f.name }}</span>
                <span class="file-item-status" :class="{ ok: Number(f.status) === 1 }">
                  {{ Number(f.status) === 1 ? '解析完成' : '解析中…' }}
                </span>
              </li>
            </ul>
            <p v-if="eventContent(block)" class="event-text">{{ eventContent(block) }}</p>
            <p v-if="parseDone(block) && eventSummary(block)" class="event-summary">{{ eventSummary(block) }}</p>
            <!-- 展开查看解析结果：点开才按会话拉取（解析产物在 act_ai_material.extract_text） -->
            <div v-if="parseDone(block)" class="parse-expand">
              <button class="parse-toggle" @click="toggleParseDetail(block)">
                {{ parseDetailOpen(block) ? '收起解析结果' : '查看解析结果' }}
              </button>
              <div v-if="parseDetailOpen(block)" class="parse-detail">
                <p v-if="parseDetailLoading" class="parse-hint">正在读取解析内容…</p>
                <p v-else-if="!parseDetailList.length" class="parse-hint">没有可展示的解析内容</p>
                <template v-else>
                  <div v-for="m in parseDetailList" :key="m.id" class="parse-item">
                    <div class="parse-item-head">
                      <span class="parse-item-name">{{ m.name }}</span>
                      <span class="parse-item-meta">
                        共 {{ m.extractLength }} 字{{ m.truncated ? ' · 以下为前 2000 字' : '' }}
                      </span>
                    </div>
                    <pre class="parse-item-text">{{ m.preview || '（未解析出文本：可能是扫描件、图片型 PDF 或空文件）' }}</pre>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- biz-side-manage-topic-changed：草稿主题已创建 -->
          <template v-else-if="block.bizType === 'biz-side-manage-topic-changed'">
            <div class="event-head">
              <span class="event-icon">📌</span>
              <span class="event-title">已创建草稿主题</span>
            </div>
            <div class="event-topic-name">{{ str(block.params.topic) }}</div>
            <p v-if="str(block.params.description)" class="event-text">{{ str(block.params.description) }}</p>
            <p class="event-hint">右侧面板已展开，可边聊边查看产物</p>
          </template>

          <!-- biz-side-manage-artifact-updated：内容已更新 -->
          <template v-else-if="block.bizType === 'biz-side-manage-artifact-updated'">
            <div class="event-head">
              <span class="event-icon">✏️</span>
              <span class="event-title">主题内容已更新</span>
              <span class="event-version">v{{ str(block.params.version) }}</span>
            </div>
            <ul class="event-list">
              <li v-for="(p, pi) in patchList(block)" :key="pi">
                {{ patchLabel(p.path) }}
                <span v-if="p.reason" class="patch-reason">· {{ p.reason }}</span>
              </li>
            </ul>
          </template>

          <!-- biz-side-manage-artifact-generated：in_progress → completed / failed -->
          <template v-else-if="block.bizType === 'biz-side-manage-artifact-generated'">
            <div class="event-head">
              <span v-if="generatedStatus(block) === 'in_progress'" class="spinner"></span>
              <span v-else-if="generatedStatus(block) === 'completed'" class="event-icon ok">✓</span>
              <span v-else class="event-icon">⚠️</span>
              <span class="event-title">
                {{ generatedStatus(block) === 'in_progress' ? '正在生成主题内容…' : generatedStatus(block) === 'completed' ? '主题内容生成完成' : '主题内容生成失败' }}
              </span>
            </div>
            <p v-if="generatedStatus(block) === 'failed' && str(block.params.error)" class="event-text error-text">
              {{ str(block.params.error) }}
            </p>
            <ul v-else-if="generatedStatus(block) === 'in_progress'" class="event-list">
              <li>已生成场景单元 {{ generatedCounts(block).scenarios }} 个</li>
            </ul>
            <ul v-else class="event-list counts">
              <li>场景单元 {{ generatedCounts(block).scenarios }} 个</li>
              <li>客户画像 {{ generatedCounts(block).profiles }} 类</li>
              <li>评估维度 {{ generatedCounts(block).dimensions }} 个</li>
            </ul>
          </template>

          <!-- biz-side-manage-case-generated：单案例完成 -->
          <template v-else-if="block.bizType === 'biz-side-manage-case-generated'">
            <div class="event-head">
              <span class="event-icon">🎬</span>
              <span class="event-title">实战案例已生成</span>
            </div>
            <div class="event-case-name">{{ str(block.params.scriptName) }}</div>
            <div class="event-case-meta">
              <span class="case-difficulty">{{ difficultyText(block) }}</span>
              <span class="case-scene">场景 {{ scenarioSeq(block) }}</span>
            </div>
          </template>

          <!-- biz-side-manage-save-success：确认落库成功 -->
          <template v-else-if="block.bizType === 'biz-side-manage-save-success'">
            <div class="event-head">
              <span class="event-icon ok">✓</span>
              <span class="event-title">内容已保存到主题</span>
              <span class="event-version">v{{ str(block.params.version) }}</span>
            </div>
            <p class="event-hint">可前往主题详情查看场景单元与评估标准</p>
            <button v-if="detailLink" class="event-link" @click="goDetail">查看主题详情 →</button>
          </template>

          <!-- 其它 bizType / 未知 action：兜底展示 -->
          <template v-else>
            <div class="event-head">
              <span class="event-icon">ℹ️</span>
              <span class="event-title">{{ block.bizType || block.actionName || '事件' }}</span>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ACT_DIFFICULTY_TEXT } from '@/types/actTheme'
import { getSessionMaterials } from '@/api/assistant'
import { useAssistantStore } from '../composables/useAssistantStore'
import { renderMarkdown } from '../utils/markdown'
import type {
  AssistantChatMessage,
  AssistantMaterialBrief,
  AssistantRenderBlock,
  CaseGeneratedParams
} from '@/types/assistant'

const props = defineProps<{ message: AssistantChatMessage }>()

const router = useRouter()
const store = useAssistantStore()

const isLastBlock = (index: number) => index === props.message.blocks.length - 1

const detailLink = computed(() => store.themeId || store.savedThemeId)
const goDetail = () => {
  const id = store.themeId || store.savedThemeId
  if (id) router.push(`/sparring/freesimulate/theme/${id}`)
}

// ---------- 通用取值 ----------
function str(v: unknown): string {
  return v == null ? '' : String(v)
}

/** 事件卡样式：进行中/成功/失败 */
function eventCardClass(block: AssistantRenderBlock): string {
  if (block.kind !== 'event') return ''
  if (!block.done || block.parseError) return 'is-pending'
  if (block.bizType === 'biz-side-manage-artifact-generated') {
    const s = generatedStatus(block)
    return s === 'failed' ? 'is-error' : s === 'completed' ? 'is-done' : 'is-pending'
  }
  if (block.bizType === 'biz-side-manage-save-success') return 'is-done'
  if (block.bizType === 'biz-common-parse-file') return parseDone(block) ? 'is-done' : 'is-pending'
  return ''
}

// ---------- parse-file ----------
function parseFiles(block: AssistantRenderBlock): { id: string; name: string; status: number }[] {
  if (block.kind !== 'event') return []
  const files = block.params.files
  if (!Array.isArray(files)) return []
  return files as { id: string; name: string; status: number }[]
}
function parseDone(block: AssistantRenderBlock): boolean {
  const files = parseFiles(block)
  if (!files.length) return false
  return files.every((f) => Number(f.status) === 1)
}
function eventContent(block: AssistantRenderBlock): string {
  return block.kind === 'event' ? str(block.params.content) : ''
}
/** 解析完成态才有 summary（材料摘要预览）。后端 content 里已内嵌该预览时不重复展示 */
function eventSummary(block: AssistantRenderBlock): string {
  if (block.kind !== 'event') return ''
  const summary = str(block.params.summary)
  if (!summary) return ''
  const content = str(block.params.content)
  return content.includes(summary.slice(0, 24)) ? '' : summary
}

// ---------- 解析结果展开（懒加载，仅展开时才请求） ----------
const parseDetailKey = ref('')
const parseDetailLoading = ref(false)
const parseDetailList = ref<AssistantMaterialBrief[]>([])

/** 卡片标识：优先用解析上下文 id（同一次解析的两态事件共用），退化用首个文件 id */
function parseKey(block: AssistantRenderBlock): string {
  if (block.kind !== 'event') return ''
  const ctx = str(block.params.context_id) || str(block.params.call_id)
  return ctx || parseFiles(block)[0]?.id || ''
}
const parseDetailOpen = (block: AssistantRenderBlock): boolean =>
  parseDetailKey.value !== '' && parseDetailKey.value === parseKey(block)

/** 展开/收起：展开时按会话拉一次材料解析结果（含提取全文的前 2000 字） */
async function toggleParseDetail(block: AssistantRenderBlock): Promise<void> {
  const key = parseKey(block)
  if (!key) return
  if (parseDetailKey.value === key) {
    parseDetailKey.value = ''
    return
  }
  parseDetailKey.value = key
  parseDetailLoading.value = true
  try {
    const resp = await getSessionMaterials(store.sessionId)
    parseDetailList.value = resp.materials ?? []
  } catch {
    parseDetailList.value = []
  } finally {
    parseDetailLoading.value = false
  }
}

// ---------- artifact-updated ----------
function patchList(block: AssistantRenderBlock): { path: string; reason?: string }[] {
  if (block.kind !== 'event') return []
  const list = block.params.content
  if (!Array.isArray(list)) return []
  return list as { path: string; reason?: string }[]
}
const PATCH_LABEL: Record<string, string> = {
  materials: '培训材料',
  scenarios: '场景单元',
  customerProfiles: '客户画像',
  icebergModel: '冰山模型',
  evaluationCriteria: '评估标准',
  professionalKnowledge: '专业知识',
  productProfiles: '产品档案',
  version: '版本'
}
function patchLabel(path: string): string {
  const key = String(path ?? '').replace(/^\//, '').split('/')[0] ?? ''
  return PATCH_LABEL[key] ?? key ?? '内容'
}

// ---------- artifact-generated ----------
function generatedStatus(block: AssistantRenderBlock): 'in_progress' | 'completed' | 'failed' {
  if (block.kind !== 'event') return 'in_progress'
  const s = str(block.params.status)
  return s === 'completed' ? 'completed' : s === 'failed' ? 'failed' : 'in_progress'
}
function generatedCounts(block: AssistantRenderBlock): { scenarios: number; profiles: number; dimensions: number } {
  if (block.kind !== 'event') return { scenarios: 0, profiles: 0, dimensions: 0 }
  const content = block.params.content as Record<string, unknown> | undefined
  const arr = (k: string): number => (Array.isArray(content?.[k]) ? (content[k] as unknown[]).length : 0)
  const criteria = content?.evaluationCriteria as { dimensions?: unknown[] } | undefined
  return {
    scenarios: arr('scenarios'),
    profiles: arr('customerProfiles'),
    dimensions: Array.isArray(criteria?.dimensions) ? criteria.dimensions.length : 0
  }
}

// ---------- case-generated ----------
function difficultyText(block: AssistantRenderBlock): string {
  if (block.kind !== 'event') return ''
  const d = Number(block.params.difficulty ?? 0)
  return d ? (ACT_DIFFICULTY_TEXT[d] ?? `${d} 级难度`) : '难度自适应'
}
/** 场景序号：从 artifact 中按 scenarioId 定位 */
function scenarioSeq(block: AssistantRenderBlock): string {
  if (block.kind !== 'event') return '--'
  const params = block.params as unknown as CaseGeneratedParams
  const scenarios = store.artifactContent?.scenarios ?? []
  const idx = scenarios.findIndex((s) => s.id === params.scenarioId)
  return idx >= 0 ? String(idx + 1) : '--'
}

// ---------- 文件 ----------
const FILE_ICON: Record<string, string> = {
  ppt: '📊',
  pptx: '📊',
  doc: '📝',
  docx: '📝',
  pdf: '📕',
  txt: '📄',
  md: '📄'
}
function fileIcon(type: string): string {
  return FILE_ICON[type?.toLowerCase()] ?? '📎'
}
function formatSize(bytes: number): string {
  if (!bytes) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped lang="scss">
.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;

  &.row-user {
    justify-content: flex-end;
  }
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2b2f3a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}

.bubble-wrap {
  max-width: 78%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bubble {
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;

  &.bubble-user {
    background: #1890ff;
    color: #fff;
    border-bottom-right-radius: 3px;

    .user-text { white-space: pre-wrap; }
  }

  &.bubble-agent {
    background: #fff;
    color: #1f2329;
    border: 1px solid #e8eaee;
    border-bottom-left-radius: 3px;
  }
}

.typing-caret {
  display: inline-block;
  margin-left: 2px;
  color: #1890ff;
  animation: caret-blink 1s steps(2, start) infinite;
}

@keyframes caret-blink {
  to { visibility: hidden; }
}

/* markdown 正文（scoped 下用 :deep 穿透 v-html 内容） */
.md-body {
  :deep(.md-p) { margin: 0 0 8px; }
  :deep(.md-p:last-child) { margin-bottom: 0; }
  :deep(.md-h) { margin: 12px 0 8px; font-weight: 600; line-height: 1.4; }
  :deep(.md-h1) { font-size: 19px; }
  :deep(.md-h2) { font-size: 17px; }
  :deep(.md-h3) { font-size: 15px; }
  :deep(.md-h4),
  :deep(.md-h5),
  :deep(.md-h6) { font-size: 14px; }
  :deep(.md-list) { margin: 0 0 8px; padding-left: 20px; }
  :deep(.md-list li) { margin: 2px 0; }
  :deep(.md-code) {
    background: #f2f3f5;
    border-radius: 3px;
    padding: 1px 5px;
    font-family: Consolas, Monaco, monospace;
    font-size: 13px;
    color: #d4477e;
  }
  :deep(.md-pre) {
    background: #f7f8fa;
    border: 1px solid #e8eaee;
    border-radius: 6px;
    padding: 10px 12px;
    overflow-x: auto;
    margin: 0 0 8px;
  }
  :deep(.md-pre-code) {
    font-family: Consolas, Monaco, monospace;
    font-size: 13px;
    white-space: pre;
  }
  /* "> 正在生成…" 引用块（线上同款样式） */
  :deep(.md-quote) {
    margin: 0 0 8px;
    padding: 8px 12px;
    background: #f5f7ff;
    border-left: 3px solid #6b5ce7;
    border-radius: 4px;
    color: #5b5f78;
    font-size: 13px;
  }
  :deep(.md-hr) { border: none; border-top: 1px solid #e8eaee; margin: 10px 0; }
  :deep(.md-table-wrap) { overflow-x: auto; margin: 0 0 10px; }
  :deep(.md-table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;

    th,
    td {
      border: 1px solid #e5e7eb;
      padding: 6px 10px;
      text-align: left;
    }

    th { background: #f7f8fa; font-weight: 600; }
  }
  :deep(a) { color: #1890ff; }
}

/* 文件消息卡 */
.file-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-width: 320px;

  .file-icon { font-size: 22px; flex-shrink: 0; }
  .file-name { font-size: 14px; color: #1f2329; font-weight: 500; }
  .file-sub { font-size: 12px; color: #a5a9b0; margin-top: 2px; }
}

/* 事件卡 */
.event-card {
  padding: 11px 14px;
  border-radius: 8px;
  background: #f7f8fa;
  border: 1px solid #e8eaee;
  font-size: 13px;
  color: #4e5969;

  &.is-pending { background: #f5f7ff; border-color: #dfe4fb; }
  &.is-done { background: #f4fbf3; border-color: #d9f0d3; }
  &.is-error { background: #fdf3f3; border-color: #f7d9d9; }
}

.event-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;

  .event-icon { font-size: 15px; }
  .event-icon.ok { color: #52c41a; }
  .event-version {
    margin-left: auto;
    font-size: 12px;
    font-weight: 400;
    color: #8a8f98;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 0 6px;
  }
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid #c7d2f5;
  border-top-color: #3b5bdb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.event-files {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;

    .file-icon.sm { font-size: 15px; }
    .file-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-item-status {
      font-size: 12px;
      color: #3b5bdb;

      &.ok { color: #52c41a; }
    }
  }
}

.event-text {
  margin: 8px 0 0;
  line-height: 1.6;

  &.error-text { color: #d43c3c; }
}

/* 材料摘要预览（parse-file 完成态） */
.event-summary {
  margin: 6px 0 0;
  padding: 7px 10px;
  background: #fff;
  border-left: 3px solid #52c41a;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #4e5969;
  max-height: 120px;
  overflow: hidden;
}

.event-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a8f98;
}

.event-topic-name {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.event-list {
  margin: 8px 0 0;
  padding-left: 18px;

  li { line-height: 1.7; }
  &.counts { padding-left: 18px; }
}

.patch-reason { color: #a5a9b0; }

.event-case-name {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.event-case-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;

  .case-difficulty,
  .case-scene {
    font-size: 12px;
    padding: 1px 8px;
    border-radius: 4px;
  }

  .case-difficulty { color: #e8940c; background: #fff7e6; }
  .case-scene { color: #6b5ce7; background: #f0edff; }
}

.event-link {
  margin-top: 8px;
  padding: 5px 12px;
  background: #fff;
  border: 1px solid #1890ff;
  color: #1890ff;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;

  &:hover { background: #e6f7ff; }
}

.event-raw {
  margin: 8px 0 0;
  padding: 8px;
  background: #fff;
  border: 1px solid #f7d9d9;
  border-radius: 4px;
  font-size: 12px;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 解析结果展开区 */
.parse-expand {
  margin-top: 8px;
}

.parse-toggle {
  padding: 4px 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  color: #595959;
  font-size: 12px;
  cursor: pointer;

  &:hover { border-color: #1890ff; color: #1890ff; }
}

.parse-detail {
  margin-top: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.parse-hint {
  margin: 0;
  font-size: 12px;
  color: #8a8f98;
}

.parse-item + .parse-item {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #eee;
}

.parse-item-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.parse-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.parse-item-meta {
  font-size: 12px;
  color: #8a8f98;
}

.parse-item-text {
  margin: 0;
  padding: 8px;
  max-height: 240px;
  overflow: auto;
  background: #fafafa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #434343;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>