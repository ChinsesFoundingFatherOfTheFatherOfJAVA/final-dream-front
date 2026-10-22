<template>
  <!-- F20 / API-41/42/43 变更通知：发送 + 历史 -->
  <div class="drawer-overlay" @click.self="$emit('close')">
    <div class="drawer">
      <div class="drawer-header">
        <span>变更通知</span>
        <span class="close-btn" @click="$emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <section class="block">
          <p class="block-title">发送变更通知</p>

          <label class="field">
            <span>变更字段</span>
            <div class="field-grid">
              <label v-for="f in FIELD_OPTIONS" :key="f.key" class="field-item">
                <el-checkbox :value="f.key" v-model="changedFields" />
                <span>{{ f.label }}</span>
              </label>
            </div>
          </label>

          <label class="field">
            <span>通知标题</span>
            <el-input v-model.trim="form.title" maxlength="200" placeholder="如：考试信息变更通知" />
          </label>

          <label class="field">
            <span>通知正文</span>
            <el-input v-model="form.content" :rows="4" placeholder="留空则由后端按变更字段自动生成" type="textarea" />
          </label>

          <div class="preview-tip" v-if="recipientQty !== null">
            预计接收人：<b>{{ recipientQty }}</b> 人（该考试已安排的考生）
          </div>

          <div class="actions">
            <el-button class="btn" :disabled="busy" @click="doPreview">生成预览</el-button>
            <el-button class="btn primary" :disabled="busy" @click="doSend">发送通知</el-button>
          </div>
          <p class="hint">发送后进入平台通用通知通道投递队列；学员端通知列表由通知服务提供。</p>
        </section>

        <section class="block">
          <p class="block-title">历史记录</p>
          <div v-if="loadingHistory" class="empty">加载中…</div>
          <div v-else-if="!history.length" class="empty">暂无变更通知</div>
          <div v-else class="history-list">
            <article v-for="n in history" :key="n.id" class="history-item">
              <div class="history-head">
                <span class="history-title">{{ n.title }}</span>
                <span class="status-tag" :class="'s' + n.status">{{ NOTICE_STATUS_TEXT[n.status] || '--' }}</span>
                <span v-if="n.status !== 3" class="revoke-link" @click="doCancel(n)">撤销</span>
              </div>
              <p class="history-content">{{ n.content }}</p>
              <p class="history-meta">
                <span>{{ n.createdByName || '系统' }}</span>
                <span>{{ n.createdAt }}</span>
                <span>接收 {{ n.recipientQty }} 人</span>
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import {
  cancelArrangeNotice, getArrangeNotices, previewArrangeNotice, sendArrangeNotice,
  NOTICE_STATUS_TEXT, type ArrangeNoticeItem
} from '@/api/arrange'

const props = defineProps<{ arrangeId: string }>()
defineEmits<{ close: [] }>()

const FIELD_OPTIONS = [
  { key: 'name', label: '考试名称' },
  { key: 'entryStartAt', label: '入场开始时间' },
  { key: 'entryEndAt', label: '入场结束时间' },
  { key: 'passScore', label: '通过分数' },
  { key: 'attemptLimit', label: '答题次数限制' },
  { key: 'paperId', label: '使用试卷' },
  { key: 'catalogId', label: '考试分类' },
  { key: 'ownerUserIds', label: '负责人' }
]

const form = reactive({ title: '', content: '' })
const changedFields = ref<string[]>([])
const recipientQty = ref<number | null>(null)
const busy = ref(false)
const history = ref<ArrangeNoticeItem[]>([])
const loadingHistory = ref(false)

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    const res = await getArrangeNotices(props.arrangeId, 1, 20)
    history.value = res.records || []
  } catch { /* 拦截器已提示 */ } finally {
    loadingHistory.value = false
  }
}

const doPreview = async () => {
  busy.value = true
  try {
    const res = await previewArrangeNotice(props.arrangeId, {
      title: form.title,
      content: form.content,
      changedFields: changedFields.value
    })
    form.title = res.title
    form.content = res.content
    recipientQty.value = res.recipientQty
    toast.success('预览已生成')
  } catch { /* 拦截器已提示 */ } finally {
    busy.value = false
  }
}

const doSend = async () => {
  const ok = await confirmDialog({
    title: '确认发送变更通知？',
    message: '将写入该考试的通知记录并投递到平台通用通知通道',
    danger: false
  })
  if (!ok) return
  busy.value = true
  try {
    const res = await sendArrangeNotice(props.arrangeId, {
      title: form.title,
      content: form.content,
      changedFields: changedFields.value
    })
    toast.success(`已发送，接收 ${res.recipientQty} 人`)
    form.title = ''
    form.content = ''
    changedFields.value = []
    recipientQty.value = null
    loadHistory()
  } catch { /* 拦截器已提示 */ } finally {
    busy.value = false
  }
}

/** 撤销：学员端列表立即不可见，还没投出去的也会被拦住。 */
const doCancel = async (n: ArrangeNoticeItem) => {
  const ok = await confirmDialog({
    title: `确认撤销通知「${n.title}」？`,
    message: '撤销后学员端不再展示这条通知，未读也会一并清零；不可恢复',
    danger: true
  })
  if (!ok) return
  try {
    await cancelArrangeNotice(props.arrangeId, n.id)
    toast.success('通知已撤销')
    loadHistory()
  } catch { /* 拦截器已提示 */ }
}

onMounted(loadHistory)
</script>

<style scoped lang="scss">
.drawer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; justify-content: flex-end; z-index: 3200; }
.drawer { width: 560px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}
.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }
.block { margin-bottom: 22px; }
.block-title { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #303133; }
.field {
  display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #4a5368; margin-bottom: 12px;
  input[type="text"], input:not([type]), textarea {
    border: 1px solid #d9d9d9; border-radius: 4px; padding: 7px 10px; font-size: 13px; outline: none;
    &:focus { border-color: #1890ff; }
  }
}
.field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; }
.field-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #4a5368; input { accent-color: #1890ff; } }
.preview-tip { margin: -4px 0 12px; font-size: 12px; color: #8a92a5; b { color: #1890ff; } }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.hint { margin: 10px 0 0; font-size: 12px; color: #a0a7b8; line-height: 1.6; }
.btn {
  padding: 7px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
.empty { text-align: center; color: #999; font-size: 12px; padding: 24px 0; }
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item { border: 1px solid #e5e8ef; border-radius: 6px; padding: 10px 12px; }
.history-head { display: flex; align-items: center; gap: 8px; }
.history-title { font-size: 13px; font-weight: 600; color: #1f2937; }
.status-tag { padding: 1px 6px; border-radius: 3px; font-size: 11px; background: #f5f5f5; color: #8c8c8c; }
.status-tag.s0 { background: #fff7e6; border: 1px solid #ffd591; color: #d46b08; }
.status-tag.s1 { background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; }
.status-tag.s2 { background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322; }
.status-tag.s3 { background: #fafafa; border: 1px solid #e5e8ef; color: #8c8c8c; }
.revoke-link { margin-left: auto; font-size: 12px; color: #1890ff; cursor: pointer; &:hover { text-decoration: underline; } }
.history-content { margin: 6px 0; font-size: 12px; color: #4a5368; line-height: 1.7; }
.history-meta { margin: 0; display: flex; gap: 14px; font-size: 12px; color: #a0a7b8; }
</style>
