<template>
  <!-- FP-12 导入试题抽屉（截图26）：步骤①下载模板 → 步骤②拖拽/点击上传 →
       系统校验数据正确性并提示错误数据（红色警示文案照截图）。 -->
    <el-drawer
    :model-value="true"
    size="560px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>导入试题（{{ format === 'word' ? 'Word' : 'Excel' }}）</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <ol class="steps">
          <li class="step">
            <span class="step-no" aria-hidden="true">1</span>
            <div class="step-main">
              <p class="step-title">下载模板</p>
              <p class="step-hint">先下载标准模板，按模板填写后再上传；模板列结构与「导出试题」一致。</p>
              <el-button class="btn" :disabled="downloading" @click="downloadTemplate">
                {{ downloading ? '下载中…' : `下载${format === 'word' ? 'Word' : 'Excel'}模板` }}
              </el-button>
            </div>
          </li>

          <li class="step">
            <span class="step-no" aria-hidden="true">2</span>
            <div class="step-main">
              <p class="step-title">上传文件</p>
              <div class="drop-zone" :class="{ over: dragOver }"
                   role="button" tabindex="0" aria-label="上传文件"
                   @click="pickFile"
                   @keydown.enter.prevent="pickFile"
                   @dragover.prevent="dragOver = true"
                   @dragleave.prevent="dragOver = false"
                   @drop.prevent="onDrop">
                <p v-if="!file" class="drop-tip">
                  将文件拖到此处，或<em>点击上传</em><br />
                  <span class="hint">支持 {{ format === 'word' ? '.docx' : '.xlsx/.xls' }}，单文件 ≤100MB</span>
                </p>
                <p v-else class="drop-file">
                  {{ file.name }}（{{ Math.round(file.size / 1024) }} KB）
                  <i role="button" tabindex="0" aria-label="移除文件" @click.stop="file = null"
                     @keydown.enter.prevent.stop="file = null">×</i>
                </p>
                <input ref="fileInput" type="file" class="hidden-file" :accept="accept" @change="onPicked" />
              </div>

              <p class="warn">
  <el-icon class="warn-icon" aria-hidden="true"><WarningFilled /></el-icon> 请勿修改模板的表头与列顺序；填写错误的行不会被导入，系统会在下方逐行提示原因。
              </p>

              <el-button class="btn primary" :disabled="!file || importing" @click="doImport">
                {{ importing ? `导入中 ${percent}%` : '开始导入' }}
              </el-button>
            </div>
          </li>
        </ol>

        <div v-if="result" class="result">
          <p class="result-title">
            导入完成：成功 <b class="ok">{{ result.successCount }}</b> 条，
            失败 <b :class="{ bad: result.failCount > 0 }">{{ result.failCount }}</b> 条
          </p>
          <div v-if="result.errors.length" class="error-list">
            <p v-for="(err, i) in result.errors" :key="i">
              第 {{ err.line }} 行：{{ err.reason }}
            </p>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">关闭</el-button>
        <el-button v-if="result?.successCount" class="btn primary" @click="emit('imported'); emit('close')">
          完成（刷新列表）
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { WarningFilled } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { toast } from '@/utils/toast'
import { downloadQuesTemplate, importQuesFile, type ImportResult } from '@/api/exam'
import { downloadPaperTemplate, importPaperFile } from '@/api/paper'

/** FP-12 导入试题：模板下载 + 上传 + 逐行错误明细。 */
const props = defineProps<{
  libId: string
  format: 'excel' | 'word'
  /** 试卷 id：走试卷导入模板（含分值列），题目落库后建试卷关联 */
  paperId?: string
}>()
const emit = defineEmits<{ close: []; imported: [] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const dragOver = ref(false)
const downloading = ref(false)
const importing = ref(false)
const percent = ref(0)
const result = ref<ImportResult | null>(null)

const accept = computed(() => props.format === 'word' ? '.docx' : '.xlsx,.xls')

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const downloadTemplate = async () => {
  downloading.value = true
  try {
    if (props.paperId) {
      // 试卷导入模板带「分值」列，由后端 classpath 静态资源分发
      saveBlob(await downloadPaperTemplate(), '试卷导入模板.xlsx')
    } else {
      const blob = await downloadQuesTemplate(props.format)
      saveBlob(blob, props.format === 'word' ? '试题导入模板.docx' : '试题导入模板.xlsx')
    }
    toast.success('模板已开始下载')
  } catch {
    toast.error('模板下载失败，请重试')
  } finally {
    downloading.value = false
  }
}

const pickFile = () => fileInput.value?.click()

const onPicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  input.value = ''
}

const onDrop = (event: DragEvent) => {
  dragOver.value = false
  file.value = event.dataTransfer?.files?.[0] ?? null
}

const doImport = async () => {
  if (!file.value) return
  importing.value = true
  percent.value = 0
  try {
    if (props.paperId) {
      // 试卷导入：错误明细带 Sheet 名，拼进 reason 一起展示
      const res = await importPaperFile(file.value, props.libId, 'root', 0,
        (p) => { percent.value = p }, props.paperId)
      result.value = {
        successCount: res.successCount,
        failCount: res.failCount,
        errors: (res.errors || []).map(e => ({ line: e.row, reason: `【${e.sheet}】${e.reason}` }))
      }
    } else {
      result.value = await importQuesFile(file.value, props.libId, (p) => { percent.value = p })
    }
    if (result.value.failCount === 0) {
      toast.success(`导入成功 ${result.value.successCount} 条`)
    } else {
      toast.warn(`成功 ${result.value.successCount} 条，失败 ${result.value.failCount} 条（见下方明细）`)
    }
  } catch {
    // 拦截器已提示
  } finally {
    importing.value = false
  }
}
</script>

<style scoped lang="scss">
.drawer {
  width: 560px;
  height: 100%;
  background: var(--color-paper);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-rule);
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }

.steps { margin: 0; padding: 0; list-style: none; }

.step {
  display: flex;
  gap: 10px;
  padding-bottom: 18px;

  .step-no {
    flex: 0 0 20px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-accent);
    color: var(--color-accent-ink);
    font-size: 12px;
    text-align: center;
    line-height: 20px;
  }

  .step-main { flex: 1; min-width: 0; }
  .step-title { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--color-ink); }
  .step-hint { margin: 0 0 8px; font-size: 12px; color: var(--color-muted); line-height: 1.7; }
}

.drop-zone {
  border: 1px dashed var(--color-rule-2);
  border-radius: 6px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;

  &:hover, &.over { border-color: var(--color-accent); background: var(--color-accent-wash); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }

  .drop-tip { margin: 0; font-size: 13px; color: var(--color-muted); line-height: 1.9; em { color: var(--color-accent); font-style: normal; } }
  .hint { font-size: 11px; color: var(--color-rule-2); }
  .drop-file {
    margin: 0; font-size: 13px; color: var(--color-ink);
    i { margin-left: 8px; font-style: normal; color: var(--color-error); cursor: pointer;
      &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 2px; } }
  }
}

.hidden-file { display: none; }

.warn { display: flex; align-items: center; gap: 4px;
  margin: 10px 0 12px;
  padding: 8px 10px;
  background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper));
  border: 1px solid color-mix(in oklab, var(--color-error) 35%, var(--color-paper));
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-error);
  line-height: 1.7;
}

.result {
  border-top: 1px solid var(--color-rule);
  padding-top: 12px;

  .result-title { margin: 0 0 8px; font-size: 13px; color: var(--color-ink-2); b { font-weight: 600; } .ok { color: var(--color-success); } .bad { color: var(--color-error); } }
}

.error-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 8px 10px;
  background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper));
  border: 1px solid color-mix(in oklab, var(--color-error) 35%, var(--color-paper));
  border-radius: 4px;

  p { margin: 0 0 3px; font-size: 12px; color: var(--color-error); line-height: 1.7; }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-rule);
}

.btn {
  padding: 7px 18px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  font-size: 13px;
  color: var(--color-ink-2);
  cursor: pointer;

  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
