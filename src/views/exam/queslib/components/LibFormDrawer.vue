<template>
  <!-- FP-04 新建/编辑题库抽屉（截图32） -->
    <el-drawer
    :model-value="true"
    size="440px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>{{ mode === 'create' ? '新建题库' : '编辑题库基本信息' }}</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="form-item">
          <label class="form-label required">题库分类</label>
          <div class="catalog-select" @click="showCatalogPicker = !showCatalogPicker">
            <span :class="{ placeholder: !catalogName }">{{ catalogName || '请选择' }}</span>
            <span class="select-arrow">▾</span>

            <div v-if="showCatalogPicker" class="catalog-dropdown" @click.stop>
              <div
                v-for="node in flatNodes"
                :key="node.id"
                class="dropdown-node"
                :style="{ paddingLeft: 10 + node.level * 16 + 'px' }"
                @click="pickCatalog(node)"
              >{{ node.name }}</div>
            </div>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label required">题库名称</label>
          <el-input v-model="name" maxlength="200" placeholder="请输入" />
          <div class="char-count">{{ name.length }}/200</div>
        </div>

        <div class="form-item">
          <label class="form-label">题库保密</label>
          <div class="radio-row">
            <label class="radio-item" :class="{ active: secrecy === 0 }">
              <el-radio :value="0" v-model="secrecy" />
              <span>公开</span>
            </label>
            <label class="radio-item" :class="{ active: secrecy === 1 }">
              <el-radio :value="1" v-model="secrecy" />
              <span>保密</span>
            </label>
          </div>
          <p class="secrecy-note">（仅支持创建者及超级管理员可编辑）</p>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">{{ mode === 'create' ? '取消' : '取消' }}</el-button>
        <el-button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : (mode === 'create' ? '确定' : '确认') }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { createLib, updateLib, getCatalogTree, type CatalogTreeNode, type LibItem } from '@/api/exam'

/** 新建/编辑题库抽屉（FP-04/06：截图32——分类树选择+名称字数+保密单选）。 */
const props = defineProps<{
  mode: 'create' | 'edit'
  lib?: LibItem | null
  defaultCatalogId?: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const name = ref('')
const secrecy = ref(0)
const catalogId = ref('root')
const catalogName = ref('默认题库分类')
const showCatalogPicker = ref(false)
const saving = ref(false)
const treeRoot = ref<CatalogTreeNode | null>(null)

interface FlatNode extends CatalogTreeNode { level: number }

const flatNodes = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatNode[] = []
  const walk = (node: CatalogTreeNode, level: number) => {
    out.push({ ...node, level })
    for (const child of node.children || []) {
      walk(child, level + 1)
    }
  }
  walk(treeRoot.value, 0)
  return out
})

const pickCatalog = (node: CatalogTreeNode) => {
  catalogId.value = node.id
  catalogName.value = node.name
  showCatalogPicker.value = false
}

const handleSave = async () => {
  if (!name.value.trim()) {
    toast.warn('请输入题库名称')
    return
  }
  saving.value = true
  try {
    if (props.mode === 'create') {
      await createLib({ name: name.value.trim(), catalogId: catalogId.value, secrecy: secrecy.value })
      toast.success('题库已创建')
    } else {
      await updateLib(props.lib!.id, { name: name.value.trim(), catalogId: catalogId.value, secrecy: secrecy.value })
      toast.success('题库信息已保存')
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (props.mode === 'edit' && props.lib) {
    name.value = props.lib.name
    secrecy.value = props.lib.secrecy
    catalogId.value = props.lib.catalogId
    catalogName.value = props.lib.catalogName
  } else if (props.defaultCatalogId && props.defaultCatalogId !== 'root') {
    // 左侧已选中分类时预填
    catalogId.value = props.defaultCatalogId
    catalogName.value = ''
  }
  try {
    treeRoot.value = await getCatalogTree() as any
    if (!catalogName.value && catalogId.value !== 'root') {
      const find = (node: CatalogTreeNode): CatalogTreeNode | null => {
        if (node.id === catalogId.value) return node
        for (const c of node.children || []) {
          const hit = find(c)
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
.drawer {
  width: 440px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px;
}

.form-item { margin-bottom: 18px; }

.form-label {
  display: block;
  font-size: 13px;
  color: #4a5368;
  margin-bottom: 6px;

  &.required::after { content: ' *'; color: #f5222d; }
}

.catalog-select {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;

  &:hover { border-color: #1890ff; }

  .placeholder { color: #b0b7c3; }
  .select-arrow { color: #8a92a5; font-size: 11px; }

  .catalog-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 240px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #e6eaf1;
    border-radius: 6px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    z-index: 10;
    padding: 4px 0;

    .dropdown-node {
      padding: 7px 12px;
      font-size: 12px;
      color: #4a5368;
      cursor: pointer;

      &:hover { background: #f2f6ff; color: #1890ff; }
    }
  }
}

input[type="text"], input:not([type]) {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;

  &:focus { border-color: #1890ff; }
}

.char-count { text-align: right; font-size: 11px; color: #b0b7c3; margin-top: 3px; }

.radio-row { display: flex; gap: 10px; }

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;

  input { margin: 0; }

  &.active { border-color: #1890ff; background: #f0f8ff; color: #1890ff; }
}

.secrecy-note { margin: 6px 0 0; font-size: 11px; color: #a0a7b8; }

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 7px 20px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>
