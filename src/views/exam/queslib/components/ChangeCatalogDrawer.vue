<template>
  <!-- FP-04 修改分类抽屉（截图35：树+搜索+按钮；batch=批量修改分类） -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>修改分类</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div v-if="batch" class="batch-tip">已选 {{ count }} 个{{ api === 'paper' ? '试卷' : '题库' }}，将统一移动到所选分类</div>

        <el-input v-model.trim="keyword" placeholder="请输入分类名称搜索" />

        <div class="tree-scroll">
          <div
            v-for="node in visibleNodes"
            :key="node.id"
            class="tree-node"
            :class="{ selected: node.id === targetId }"
            :style="{ paddingLeft: 12 + node.level * 18 + 'px' }"
            @click="targetId = node.id"
          >
            <span
              v-if="node.children && node.children.length"
              class="expand-arrow"
              :class="{ expanded: expandedKeys.has(node.id) }"
              @click.stop="toggleExpand(node.id)"
            >›</span>
            <span v-else class="expand-placeholder"></span>
            <span class="node-name">{{ node.name }}</span>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!targetId || saving" @click="handleSave">
          {{ saving ? '保存中...' : '确定' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getCatalogTree, changeLibCatalog, batchLib, type CatalogTreeNode, type LibItem } from '@/api/exam'
import { batchPaper, changePaperCatalog, getPaperCatalogTree } from '@/api/paper'

/** 修改分类抽屉（FP-04：单库 changeLibCatalog / 批量 batchLib('changeCatalog')）。 */
/** 试卷（PaperItem）与题库（LibItem）共用的字段，故用结构类型。 */
type LibLike = Pick<LibItem, 'id' | 'catalogId'>

const props = defineProps<{
  lib: LibLike | null
  batch?: boolean
  count?: number
  /** 题库（默认）还是试卷——两者分类树同构 */
  api?: 'ques' | 'paper'
  /** 批量模式下由父组件传入已勾选的题库 id 列表 */
  libIds?: string[]
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const treeRoot = ref<CatalogTreeNode | null>(null)
const keyword = ref('')
const targetId = ref('')
const expandedKeys = ref(new Set<string>(['root']))
const saving = ref(false)

interface FlatNode extends CatalogTreeNode { level: number }

const visibleNodes = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatNode[] = [{ ...treeRoot.value, level: 0 }]
  const walk = (node: CatalogTreeNode, level: number) => {
    if (!keyword.value || node.name.includes(keyword.value)) {
      out.push({ ...node, level })
    }
    if (keyword.value || expandedKeys.value.has(node.id)) {
      for (const child of node.children || []) {
        walk(child, level + 1)
      }
    }
  }
  for (const child of treeRoot.value.children || []) {
    walk(child, 1)
  }
  return out
})

const toggleExpand = (id: string) => {
  if (expandedKeys.value.has(id)) {
    expandedKeys.value.delete(id)
  } else {
    expandedKeys.value.add(id)
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    if (props.batch) {
      // 批量修改分类：ids 由父组件传入，本抽屉只负责选目标分类；按 api 走各自的批量接口
      const ids = props.libIds || []
      if (props.api === 'paper') {
        await batchPaper('changeCatalog', ids, undefined, targetId.value)
        toast.success(`已将 ${ids.length} 张试卷移动到所选分类`)
      } else {
        await batchLib('changeCatalog', ids, undefined, targetId.value)
        toast.success(`已将 ${ids.length} 个题库移动到所选分类`)
      }
      emit('saved')
    } else {
      if (props.api === 'paper') {
        await changePaperCatalog(props.lib!.id, targetId.value)
      } else {
        await changeLibCatalog(props.lib!.id, targetId.value)
      }
      toast.success('分类已修改')
      emit('saved')
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    treeRoot.value = (props.api === 'paper' ? await getPaperCatalogTree() : await getCatalogTree()) as any
    if (props.lib) {
      targetId.value = props.lib.catalogId
    }
  } catch { /* handled */ }
})
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: 3100;
}

.drawer {
  width: 420px;
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
  display: flex;
  flex-direction: column;
  padding: 14px 20px;
  gap: 12px;

  input {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;

    &:focus { border-color: #1890ff; }
  }
}

.batch-tip {
  background: #fffbe6;
  border: 1px solid #ffe9a8;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12px;
  color: #ad8b00;
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid #eef1f6;
  border-radius: 6px;
  padding: 8px 0;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;

  .expand-arrow {
    width: 16px;
    text-align: center;
    color: #a0a7b8;
    transition: transform 0.15s;

    &.expanded { transform: rotate(90deg); }
  }

  .expand-placeholder { width: 16px; }

  &:hover { background: #f7faff; }

  &.selected {
    background: #e8f1ff;
    color: #1890ff;
    font-weight: 500;
  }
}

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
