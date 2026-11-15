<template>
  <!-- FP-12 快速出卷抽屉（截图23）：①下载模板 ②选择题库 ③选分类+保密 ④上传解析 -->
    <el-drawer
    :model-value="true"
    size="720px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>快速出卷</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <ol class="steps">
          <!-- ① 下载模板 -->
          <li class="step">
            <span class="step-no" aria-hidden="true">1</span>
            <div class="step-main">
              <p class="step-title">点击「下载」按钮下载需要导入的模板文件。</p>
              <p class="step-warn">请仔细阅读模板中的说明，并按要求格式填写导入的数据。</p>
              <el-button class="btn primary" :disabled="downloading" @click="downloadTemplate">
                {{ downloading ? '下载中…' : '下载' }}
              </el-button>
            </div>
          </li>

          <!-- ② 选择题库（整卷题目归属库） -->
          <li class="step">
            <span class="step-no" aria-hidden="true">2</span>
            <div class="step-main">
              <p class="step-title">选择试题所属题库。</p>
              <el-select v-model="libId" class="field">
                <el-option value="" label="选择题库" />
                <el-option v-for="lib in libs" :key="lib.id" :value="lib.id" :label="lib.name" />
              </el-select>
              <p class="step-hint">整卷题目都会写入该题库；找不到目标库可先去「题库管理」新建。</p>
            </div>
          </li>

          <!-- ③ 选试卷分类 + 保密 -->
          <li class="step">
            <span class="step-no" aria-hidden="true">3</span>
            <div class="step-main">
              <p class="step-title">选择试卷所属分类。</p>
              <div class="inline-field">
                <span class="inline-label">选择分类</span>
                <div class="catalog-select" role="button" tabindex="0" aria-label="选择试卷分类"
                     @click="showCatalogPicker = !showCatalogPicker"
                     @keydown.enter.prevent="showCatalogPicker = !showCatalogPicker">
                  <span :class="{ placeholder: !catalogName }">{{ catalogName || '请选择试卷分类' }}</span>
                  <span class="select-arrow" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
                  <div v-if="showCatalogPicker" class="catalog-dropdown" @click.stop>
                    <div
                      v-for="node in flatNodes"
                      :key="node.id"
                      class="dropdown-node"
                      :style="{ paddingLeft: 10 + node.level * 16 + 'px' }"
                      role="button" tabindex="0"
                      @click="pickCatalog(node)"
                      @keydown.enter.prevent="pickCatalog(node)"
                    >{{ node.name }}</div>
                  </div>
                </div>
              </div>
              <div class="radio-row">
                <label class="radio-item">
                  <el-radio v-model.number="secrecy" :value="0" />
                  <span>公开</span>
                </label>
                <label class="radio-item">
                  <el-radio v-model.number="secrecy" :value="1" />
                  <span>保密 <em class="note-inline">（仅支持创建者及超级管理员可编辑）</em></span>
                </label>
              </div>
            </div>
          </li>

          <!-- ④ 上传文件 -->
          <li class="step">
            <span class="step-no" aria-hidden="true">4</span>
            <div class="step-main">
              <p class="step-title">完成文件的填写后，点击或将文件拖拽到上传区域进行上传。</p>
              <p class="step-hint">
                系统会校验填写数据的正确性，并提示错误的数据；校验无错误数据时，系统将数据导入到系统中。
              </p>
              <p class="step-warn">.xls 后缀的 Excel 模板不再支持题干中添加图片上传，如有需要请下载最新模板编辑后上传。</p>
              <div class="drop-zone" :class="{ over: dragOver }"
                   role="button" tabindex="0" aria-label="上传文件"
                   @click="pickFile"
                   @keydown.enter.prevent="pickFile"
                   @dragover.prevent="dragOver = true"
                   @dragleave.prevent="dragOver = false"
                   @drop.prevent="onDrop">
                <p v-if="!file" class="drop-tip">
                  <svg class="drop-icon" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M24 32V12M24 12l-8 8M24 12l8 8" />
                    <path d="M8 34v4a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2v-4" />
                  </svg>
                  点击或将文件拖拽到这里上传<br />
                  <span class="hint">支持扩展名：.xlsx .xls</span>
                </p>
                <p v-else class="drop-file">
                  {{ file.name }}（{{ Math.round(file.size / 1024) }} KB）
                  <i role="button" tabindex="0" aria-label="移除文件" @click.stop="file = null"
                     @keydown.enter.prevent.stop="file = null">×</i>
                </p>
                <input ref="fileInput" type="file" class="hidden-file" accept=".xlsx,.xls" @change="onPicked" />
              </div>

              <el-button class="btn primary import-btn" :disabled="!canImport || importing" @click="doImport">
                {{ importing ? `导入中 ${percent}%` : '开始导入' }}
              </el-button>
              <span v-if="!canImport" class="need-tip">请先完成上方第 2、3 步</span>
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
              【{{ err.sheet }}】第 {{ err.row }} 行：{{ err.reason }}
            </p>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">关闭</el-button>
        <el-button v-if="result" class="btn primary" @click="emit('imported', result.paperId); emit('close')">
          完成（刷新列表）
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getLibList, type LibItem } from '@/api/exam'
import {
  downloadPaperTemplate, getPaperCatalogTree, importPaperFile,
  type PaperCatalogTreeNode, type PaperImportResult
} from '@/api/paper'

/** FP-12 快速出卷：四步骤「下载模板 → 选择题库 → 选分类保密 → 上传导入」。 */
const props = defineProps<{ defaultCatalogId?: string }>()
const emit = defineEmits<{ close: []; imported: [paperId?: string] }>()

const downloading = ref(false)
const importing = ref(false)
const percent = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const dragOver = ref(false)
const result = ref<PaperImportResult | null>(null)

const libs = ref<LibItem[]>([])
const libId = ref('')

const secrecy = ref(0)
const catalogId = ref(props.defaultCatalogId || 'root')
const catalogName = ref(props.defaultCatalogId && props.defaultCatalogId !== 'root' ? '' : '默认试卷分类')
const showCatalogPicker = ref(false)
const treeRoot = ref<PaperCatalogTreeNode | null>(null)

interface FlatNode extends PaperCatalogTreeNode { level: number }

const flatNodes = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatNode[] = []
  const walk = (node: PaperCatalogTreeNode, level: number) => {
    out.push({ ...node, level })
    for (const child of node.children || []) walk(child, level + 1)
  }
  walk(treeRoot.value, 0)
  return out
})

const canImport = computed(() => !!file.value && !!libId.value && !!catalogId.value)

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
    saveBlob(await downloadPaperTemplate(), '试卷导入模板.xlsx')
    toast.success('模板已开始下载')
  } catch {
    toast.error('模板下载失败，请重试')
  } finally {
    downloading.value = false
  }
}

const pickCatalog = (node: PaperCatalogTreeNode) => {
  catalogId.value = node.id
  catalogName.value = node.name
  showCatalogPicker.value = false
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
  if (!canImport.value || !file.value) return
  importing.value = true
  percent.value = 0
  try {
    result.value = await importPaperFile(file.value, libId.value, catalogId.value, secrecy.value,
      (p) => { percent.value = p })
    if (result.value.failCount === 0) {
      toast.success(`导入成功 ${result.value.successCount} 题`)
    } else {
      toast.warn(`成功 ${result.value.successCount} 题，失败 ${result.value.failCount} 行（见下方明细）`)
    }
  } catch {
    // 拦截器已提示
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getLibList(1, 200, 'updateTime', 'desc', {
      queryType: 0, keyword: '', catalogId: 'root', routingPath: '',
      creatorUserId: '', disabled: 0
    })
    libs.value = res.records || []
  } catch { /* 拦截器已提示 */ }
  try {
    treeRoot.value = await getPaperCatalogTree() as any
    if (!catalogName.value && catalogId.value !== 'root') {
      const find = (node: PaperCatalogTreeNode): PaperCatalogTreeNode | null => {
        if (node.id === catalogId.value) return node
        for (const child of node.children || []) {
          const hit = find(child)
          if (hit) return hit
        }
        return null
      }
      catalogName.value = find(treeRoot.value!)?.name || ''
    }
  } catch { /* 拦截器已提示 */ }
})
</script>

<style scoped lang="scss">
.drawer { width: 720px; height: 100%; background: var(--color-paper); display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid var(--color-rule); font-size: 15px; font-weight: 600;

  .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }

.steps { margin: 0; padding: 0; list-style: none; }

/* 原图（快速出卷抽屉）是左侧时间轴：序号圆点 + 一条把它们串起来的竖线 */
.step {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 22px;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 24px;
    bottom: 2px;
    width: 1px;
    background: var(--color-rule);
  }

  .step-no {
    position: relative; z-index: 1;
    flex: 0 0 19px; width: 19px; height: 19px; border-radius: 50%;
    border: 1px solid var(--color-rule-2); background: var(--color-paper);
    color: var(--color-muted); font-size: 11px; text-align: center; line-height: 17px;
  }

  .step-main { flex: 1; min-width: 0; }
  .step-title { margin: 0 0 8px; font-size: 13px; color: var(--color-ink); line-height: 1.7; }
  .step-hint { margin: 0 0 8px; font-size: 12px; color: var(--color-muted); line-height: 1.7; }
  .step-warn { margin: 0 0 10px; font-size: 12px; color: var(--color-error); line-height: 1.7; }
}

.field {
  width: 100%; border: 1px solid var(--color-rule-2); border-radius: 4px;
  padding: 8px 10px; font-size: 13px; outline: none;
  &:focus { border-color: var(--color-accent); }
}

.catalog-select {
  position: relative;
  display: flex; align-items: center; justify-content: space-between;
  border: 1px solid var(--color-rule-2); border-radius: 4px; padding: 8px 10px;
  font-size: 13px; cursor: pointer; margin-bottom: 10px;

  &:hover { border-color: var(--color-accent); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
  .placeholder { color: var(--color-rule-2); }
  .select-arrow { color: var(--color-muted); font-size: 11px; }

  .catalog-dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    max-height: 240px; overflow-y: auto;
    background: var(--color-paper); border: 1px solid var(--color-rule); border-radius: 6px;
    box-shadow: 0 4px 14px var(--shadow-card); z-index: 10; padding: 4px 0;

    .dropdown-node {
      padding: 7px 12px; font-size: 12px; color: var(--color-ink-2); cursor: pointer;
      &:hover { background: var(--color-accent-wash); color: var(--color-accent); }
      &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
    }
  }
}

/* 第③步：标签与下拉同一行（原图是「选择分类 [下拉]」） */
.inline-field {
  display: flex; align-items: center; gap: 14px; margin-bottom: 12px;

  .inline-label { flex: 0 0 auto; font-size: 13px; color: var(--color-ink-2); }
  .catalog-select { flex: 1; margin-bottom: 0; }
}

.radio-row { display: flex; align-items: center; gap: 22px; }

/* 原图里保密是普通单选 + 行内注释 */
.radio-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--color-ink-2); cursor: pointer;

  input { margin: 0; accent-color: var(--color-accent); }
}

.note-inline { font-style: normal; font-size: 12px; color: var(--color-rule-2); }

.drop-zone {
  border: 1px dashed var(--color-rule-2);
  border-radius: 6px;
  padding: 40px 16px;
  text-align: center;
  cursor: pointer;

  &:hover, &.over { border-color: var(--color-accent); background: var(--color-accent-wash); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }

  .drop-tip { margin: 0; font-size: 13px; color: var(--color-ink-2); line-height: 2.1; em { color: var(--color-accent); font-style: normal; } }
  .hint { font-size: 11px; color: var(--color-rule-2); }
  .drop-file {
    margin: 0; font-size: 13px; color: var(--color-ink);
    i { margin-left: 8px; font-style: normal; color: var(--color-error); cursor: pointer;
      &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 2px; } }
  }

  .drop-icon {
    display: block; width: 48px; height: 48px; margin: 0 auto 12px;
    fill: none; stroke: var(--color-rule-2); stroke-width: 2.5;
    stroke-linecap: round; stroke-linejoin: round;
  }
}

.hidden-file { display: none; }

.import-btn { margin-top: 14px; }

.need-tip { margin-left: 10px; font-size: 12px; color: var(--color-error); }

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
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--color-rule);
}

.btn {
  padding: 7px 18px; border: 1px solid var(--color-rule-2); border-radius: 4px;
  background: var(--color-paper); font-size: 13px; color: var(--color-ink-2); cursor: pointer;

  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
