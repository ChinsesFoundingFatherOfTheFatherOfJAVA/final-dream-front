<template>
  <!-- 分类树面板（题库分类 / 试卷分类共用）。
       两侧数据结构与交互完全一致（05 FP-04：与题库分类树组件完全复用）。 -->
  <aside class="catalog-panel">
    <div class="panel-toolbar">
      <el-input v-model.trim="keyword" :placeholder="searchPlaceholder" />
      <el-button class="btn-outline" @click="emit('create')">{{ createLabel }}</el-button>
    </div>
    <div class="tree-scroll">
      <div
        v-for="node in visibleNodes"
        :key="node.id"
        class="tree-node"
        :class="{ active: node.id === selectedId, disabled: node.disabled === 1 }"
        :style="{ paddingLeft: 12 + node.level * 18 + 'px' }"
        role="button"
        tabindex="0"
        @click="emit('select', node)"
        @keydown.enter.prevent="emit('select', node)"
      >
        <span
          v-if="node.children && node.children.length"
          class="expand-arrow"
          :class="{ expanded: expandedKeys.has(node.id) }"
          role="button"
          tabindex="0"
          :aria-label="expandedKeys.has(node.id) ? '收起子分类' : '展开子分类'"
          @click.stop="toggleExpand(node.id)"
          @keydown.enter.prevent="toggleExpand(node.id)"
        ><el-icon><ArrowRight /></el-icon></span>
        <span v-else class="expand-placeholder"></span>
        <span class="node-name" :title="node.name">{{ node.name }}</span>
        <!-- 齿轮菜单：悬浮子分类才显示（截图05） -->
        <span v-if="node.id !== 'root'" class="gear-btn" title="分类操作" aria-label="分类操作"
              role="button" tabindex="0"
              @click.stop="emit('gear', { node, event: $event })"
              @keydown.enter.prevent="emit('gear', { node, event: $event as unknown as MouseEvent })"><el-icon><MoreFilled /></el-icon></span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ArrowRight, MoreFilled } from '@element-plus/icons-vue'
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
  background: var(--color-paper);
  border-right: var(--rule-hair) solid var(--color-rule);
  display: flex;
  flex-direction: column;

  .panel-toolbar {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 12px;
}

/* 树节点：横向窄行 hover 只动字色，激活 accent-wash 底 + accent-deep 字（无底色块重铺） */
.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--color-ink-2);
  cursor: pointer;
  position: relative;
  transition: background-color var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out);

  &:hover { color: var(--color-accent-deep); }

  &.active {
    background: var(--color-accent-wash);
    color: var(--color-accent-deep);
    font-weight: 600;
  }

  &.disabled { opacity: .55; }

  // 键盘焦点环（节点/内部按钮均可聚焦）
  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  // 键盘 Tab 聚焦时同步显示齿轮按钮（原本仅 hover 显示）
  &:focus-within .gear-btn { display: inline; }

  .expand-arrow {
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    transition: transform var(--dur-micro) var(--ease-out);
    flex-shrink: 0;
    cursor: pointer;

    .el-icon { font-size: 12px; transition: transform var(--dur-micro) var(--ease-out); }
    &.expanded .el-icon { transform: rotate(90deg); }

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
      border-radius: 2px;
    }
  }

  .expand-placeholder { width: 16px; flex-shrink: 0; }

  .node-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gear-btn {
    display: none;
    color: var(--color-muted);
    font-size: 12px;
    padding: 0 2px;
    cursor: pointer;

    &:hover { color: var(--color-accent); }

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
      border-radius: 2px;
    }
  }

  &:hover .gear-btn { display: inline; }
}

/* plain 形按钮：accent-wash 底 + accent-deep 字（敢做档表单口径，不再手绘描边按钮） */
.btn-outline {
  border-radius: var(--radius-input);
  padding: 7px 12px;
  font-size: 12px;
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
  border: none;
  cursor: pointer;
  transition: background-color var(--dur-micro) var(--ease-out), transform var(--dur-micro) var(--ease-out), box-shadow var(--dur-micro) var(--ease-out);

  &:hover {
    background: color-mix(in oklab, var(--color-accent-wash) 82%, var(--color-accent));
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }

  &:active { transform: translateY(1px); box-shadow: var(--shadow-key-press); }
  &:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
}
</style>
