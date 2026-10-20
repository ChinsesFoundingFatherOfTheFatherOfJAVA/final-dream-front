<template>
  <!-- FP-03 移动分类抽屉（截图07：树单选+搜索；默认只展开第一层，可展开收起） -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>移动分类</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <input v-model.trim="keyword" type="search" placeholder="请输入分类名称搜索" />

        <div class="tree-scroll">
          <div
            v-for="node in visibleNodes"
            :key="node.id"
            class="tree-node"
            :class="{ selected: node.id === targetId, [`level-${node.level}`]: true }"
            :style="{ paddingLeft: 12 + node.level * 18 + 'px' }"
            @click="node.id !== catalogId && (targetId = node.id)"
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
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="!targetId || moving" @click="handleMove">
          {{ moving ? '移动中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getCatalogTree, moveCatalog, type CatalogTreeNode } from '@/api/exam'
import { getPaperCatalogTree, movePaperCatalog } from '@/api/paper'
import { getArrangeCatalogTree, moveArrangeCatalog } from '@/api/arrange'

/**
 * 移动分类抽屉（FP-03）：树默认只展开第一层、点箭头展开/收起（可闭合——守既有教训）；
 * 自身及其子孙不可选（后端也校验）。
 */
const props = defineProps<{ catalogId: string; api?: 'ques' | 'paper' | 'arrange' }>()

/** 题库/试卷分类结构同构，仅接口不同。 */
const isPaper = computed(() => props.api === 'paper')
/** 考试分类：结构与题库/试卷同构，只是接口不同。 */
const isArrange = computed(() => props.api === 'arrange')
const emit = defineEmits<{ close: []; moved: [] }>()

const treeRoot = ref<CatalogTreeNode | null>(null)
const keyword = ref('')
const targetId = ref('')
const expandedKeys = ref(new Set<string>(['root']))
const moving = ref(false)

interface FlatNode extends CatalogTreeNode { level: number }

const visibleNodes = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatNode[] = [{ ...treeRoot.value, level: 0 }]
  const walk = (node: CatalogTreeNode, level: number) => {
    const disabled = node.id === props.catalogId
    if (!keyword.value || node.name.includes(keyword.value)) {
      out.push({ ...node, level, id: disabled ? node.id + '##self' : node.id })
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

const handleMove = async () => {
  moving.value = true
  try {
    await (isArrange.value
      ? moveArrangeCatalog(props.catalogId, targetId.value)
      : isPaper.value
        ? movePaperCatalog(props.catalogId, targetId.value)
        : moveCatalog(props.catalogId, targetId.value))
    toast.success('分类已移动')
    emit('moved')
  } finally {
    moving.value = false
  }
}

onMounted(async () => {
  try {
    treeRoot.value = (isArrange.value ? await getArrangeCatalogTree() : isPaper.value ? await getPaperCatalogTree() : await getCatalogTree()) as any
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
