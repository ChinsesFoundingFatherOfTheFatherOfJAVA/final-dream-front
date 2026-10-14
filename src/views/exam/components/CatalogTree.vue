<template>
  <!-- 分类树面板（题库分类 / 试卷分类共用）。
       两侧数据结构与交互完全一致（05 FP-04：与题库分类树组件完全复用）。 -->
  <aside class="catalog-panel">
    <div class="panel-toolbar">
      <input v-model.trim="keyword" type="search" :placeholder="searchPlaceholder" />
      <button class="btn-outline" type="button" @click="emit('create')">{{ createLabel }}</button>
    </div>
    <div class="tree-scroll">
      <div
        v-for="node in visibleNodes"
        :key="node.id"
        class="tree-node"
        :class="{ active: node.id === selectedId, disabled: node.disabled === 1 }"
        :style="{ paddingLeft: 12 + node.level * 18 + 'px' }"
        @click="emit('select', node)"
      >
        <span
          v-if="node.children && node.children.length"
          class="expand-arrow"
          :class="{ expanded: expandedKeys.has(node.id) }"
          @click.stop="toggleExpand(node.id)"
        >›</span>
        <span v-else class="expand-placeholder"></span>
        <span class="node-name" :title="node.name">{{ node.name }}</span>
        <!-- 齿轮菜单：悬浮子分类才显示（截图05） -->
        <span v-if="node.id !== 'root'" class="gear-btn" title="分类操作"
              @click.stop="emit('gear', { node, event: $event })">⚙</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/** 树节点最小契约：题库/试卷分类共用同一份结构。 */
export interface CatalogNode {
  id: string
  name: string
  parentId: string
  routingPath: string
  disabled: number
  libQty?: number
  children: CatalogNode[] | null
}

const props = withDefaults(defineProps<{
  tree: CatalogNode | null
  selectedId: string
  searchPlaceholder?: string
  createLabel?: string
}>(), {
  searchPlaceholder: '请输入分类名称搜索',
  createLabel: '新建分类'
})

const emit = defineEmits<{
  select: [node: CatalogNode]
  create: []
  gear: [payload: { node: CatalogNode; event: MouseEvent }]
}>()

interface FlatNode extends CatalogNode { level: number }

const keyword = ref('')
const expandedKeys = ref(new Set<string>(['root']))

const subtreeHas = (node: CatalogNode, kw: string): boolean => {
  if (node.name.includes(kw)) return true
  return (node.children || []).some(child => subtreeHas(child, kw))
}

const visibleNodes = computed<FlatNode[]>(() => {
  const root = props.tree
  if (!root) return []
  const kw = keyword.value.trim()
  const out: FlatNode[] = []
  const walk = (node: CatalogNode, level: number) => {
    const hit = !kw || node.name.includes(kw)
    const childHit = kw ? (node.children || []).some(c => subtreeHas(c, kw)) : false
    if (hit || childHit) {
      out.push({ ...node, level })
    }
    if (!kw && expandedKeys.value.has(node.id)) {
      for (const child of node.children || []) walk(child, level + 1)
    } else if (kw) {
      // 搜索态：命中的子树保持展开
      for (const child of node.children || []) {
        if (subtreeHas(child, kw)) walk(child, level + 1)
      }
    }
  }
  out.push({ ...root, level: 0 })
  if (expandedKeys.value.has('root') || kw) {
    for (const child of root.children || []) walk(child, 1)
  }
  return out
})

const toggleExpand = (id: string) => {
  const next = new Set(expandedKeys.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedKeys.value = next
}
</script>

<style scoped lang="scss">
.catalog-panel {
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e6eaf1;
  display: flex;
  flex-direction: column;

  .panel-toolbar {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    input {
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      outline: none;

      &:focus { border-color: #1890ff; }
    }
  }
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 12px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;
  position: relative;

  &:hover { background: #f3f7ff; }
  &.active { background: #eaf2ff; color: #1890ff; font-weight: 600; }
  &.disabled { opacity: .55; }

  .expand-arrow {
    width: 16px;
    text-align: center;
    color: #a0a7b8;
    transition: transform .15s;
    flex-shrink: 0;

    &.expanded { transform: rotate(90deg); }
  }

  .expand-placeholder { width: 16px; flex-shrink: 0; }

  .node-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gear-btn {
    display: none;
    color: #8a92a5;
    font-size: 12px;
    padding: 0 2px;
    cursor: pointer;

    &:hover { color: #1890ff; }
  }

  &:hover .gear-btn { display: inline; }
}

.btn-outline {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  padding: 7px 12px;
  font-size: 12px;
  color: #4a5368;
  cursor: pointer;

  &:hover { border-color: #1890ff; color: #1890ff; }
}
</style>