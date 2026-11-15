<template>
  <!-- FP-05 创建/编辑试卷抽屉（截图22）：表单四字段 + 字数统计 -->
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
        <span>{{ mode === 'create' ? '新建试卷' : '编辑试卷' }}</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="form-item">
          <label class="form-label required">试卷分类</label>
          <div class="catalog-select" role="button" tabindex="0" aria-label="选择试卷分类"
               @click="showCatalogPicker = !showCatalogPicker"
               @keydown.enter.prevent="showCatalogPicker = !showCatalogPicker">
            <span :class="{ placeholder: !catalogName }">{{ catalogName || '请选择' }}</span>
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

        <div class="form-item">
          <label class="form-label required">试卷名称</label>
          <el-input v-model="name" maxlength="200" placeholder="请输入" />
          <div class="char-count">{{ name.length }}/200</div>
        </div>

        <div class="form-item">
          <label class="form-label required">出卷方式</label>
          <div class="radio-row">
            <label class="radio-item">
              <el-radio v-model.number="buildType" :value="0" :disabled="mode === 'edit'" />
              <span>固定出卷</span>
            </label>
            <label class="radio-item">
              <el-radio v-model.number="buildType" :value="1" :disabled="mode === 'edit'" />
              <span>随机出卷</span>
            </label>
          </div>
          <p v-if="mode === 'edit'" class="note">出卷方式创建后不可更改</p>
        </div>

        <div class="form-item">
          <label class="form-label">试卷保密</label>
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
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中…' : '确定' }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  createPaper, getPaperCatalogTree, getPaperDetail, updatePaper,
  type PaperCatalogTreeNode, type PaperItem
} from '@/api/paper'

/** 新建/编辑试卷抽屉（截图22）。出卷方式创建后不可改，故编辑态禁用。 */
const props = defineProps<{
  mode: 'create' | 'edit'
  paper?: PaperItem | null
  defaultCatalogId?: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const name = ref('')
const buildType = ref(0)
const secrecy = ref(0)
const catalogId = ref('root')
const catalogName = ref('默认试卷分类')
const showCatalogPicker = ref(false)
const saving = ref(false)
const treeRoot = ref<PaperCatalogTreeNode | null>(null)

interface FlatNode extends PaperCatalogTreeNode { level: number }

const flatNodes = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatNode[] = []
  const walk = (node: PaperCatalogTreeNode, level: number) => {
    out.push({ ...node, level })
    for (const child of node.children || []) {
      walk(child, level + 1)
    }
  }
  walk(treeRoot.value, 0)
  return out
})

const pickCatalog = (node: PaperCatalogTreeNode) => {
  catalogId.value = node.id
  catalogName.value = node.name
  showCatalogPicker.value = false
}

const handleSave = async () => {
  if (!name.value.trim()) {
    toast.warn('请输入试卷名称')
    return
  }
  saving.value = true
  try {
    if (props.mode === 'create') {
      await createPaper({
        name: name.value.trim(),
        catalogId: catalogId.value,
        buildType: buildType.value,
        secrecy: secrecy.value
      })
      toast.success('试卷已创建')
    } else {
      await updatePaper(props.paper!.id, {
        name: name.value.trim(),
        catalogId: catalogId.value,
        buildType: buildType.value,
        secrecy: secrecy.value
      })
      toast.success('试卷信息已保存')
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (props.mode === 'edit' && props.paper) {
    name.value = props.paper.name
    buildType.value = props.paper.buildType
    secrecy.value = props.paper.secrecy
    catalogId.value = props.paper.catalogId
    catalogName.value = props.paper.catalogName
  } else if (props.defaultCatalogId && props.defaultCatalogId !== 'root') {
    catalogId.value = props.defaultCatalogId
    catalogName.value = ''
  }
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
  } catch { /* handled */ }
})
</script>

<style scoped lang="scss">
/* 原图抽屉是"半屏宽表单"，字段基本铺满，故比题库那个 440px 的抽屉宽 */
.drawer { width: 720px; height: 100%; background: var(--color-paper); display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid var(--color-rule); font-size: 15px; font-weight: 600;

  .close-btn { font-size: 22px; color: var(--color-muted); cursor: pointer; &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 20px; }

.form-item { margin-bottom: 18px; }

.form-label {
  display: block; font-size: 13px; color: var(--color-ink-2); margin-bottom: 6px;
  &.required::after { content: ' *'; color: var(--color-error); }
}

.catalog-select {
  position: relative;
  display: flex; align-items: center; justify-content: space-between;
  border: 1px solid var(--color-rule-2); border-radius: 4px; padding: 8px 10px;
  font-size: 13px; cursor: pointer;

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

input[type="text"], input:not([type]) {
  width: 100%; border: 1px solid var(--color-rule-2); border-radius: 4px;
  padding: 8px 10px; font-size: 13px; outline: none;
  &:focus { border-color: var(--color-accent); }
}

.char-count { text-align: right; font-size: 11px; color: var(--color-rule-2); margin-top: 3px; }

.radio-row { display: flex; align-items: center; gap: 22px; }

/* 原图（截图22）里出卷方式/保密都是普通单选，不带方框 */
.radio-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--color-ink-2); cursor: pointer;

  input { margin: 0; accent-color: var(--color-accent); }
  &:has(input:disabled) { color: var(--color-rule-2); cursor: not-allowed; }
}

.note-inline { font-style: normal; font-size: 12px; color: var(--color-rule-2); }

.note { margin: 6px 0 0; font-size: 11px; color: var(--color-rule-2); }

.drawer-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--color-rule);
}

.btn {
  padding: 7px 20px; border: 1px solid var(--color-rule-2); border-radius: 4px;
  background: var(--color-paper); font-size: 13px; cursor: pointer;

  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
