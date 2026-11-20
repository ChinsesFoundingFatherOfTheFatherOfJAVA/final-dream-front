<template>
  <aside class="catalog-tree-panel">
    <div class="tree-toolbar">
      <el-input
        v-model.trim="keyword"
        class="tree-search"
        placeholder="搜索分类名称"
        clearable
      >
        <template #prefix><span aria-hidden="true"><el-icon><Search /></el-icon></span></template>
      </el-input>
      <el-button class="collapse-btn" aria-label="收起分类树" title="收起分类树" @click="emit('collapse')"><el-icon><Fold /></el-icon></el-button>
    </div>

    <div class="tree-body">
      <div
        v-if="!keyword"
        class="tree-row root-row"
        :class="{ selected: modelValue === '' }"
        role="button"
        tabindex="0"
        @click="select('')"
        @keydown.enter.prevent="select('')"
      >
        <el-button class="tree-arrow" :class="{ expanded: rootExpanded }"
                   :aria-label="rootExpanded ? '收起子分类' : '展开子分类'" @click.stop="toggleRoot">
          <span aria-hidden="true" />
        </el-button>
        <span class="tree-label">主课堂</span>
      </div>

      <template v-if="rootExpanded || keyword">
        <div
          v-for="row in rows"
          :key="row.node.id"
          class="tree-row"
          :class="{ selected: modelValue === row.node.id }"
          :style="{ paddingLeft: `${12 + row.depth * 18}px` }"
          role="button"
          tabindex="0"
          @click="select(row.node.id)"
          @keydown.enter.prevent="select(row.node.id)"
        >
          <el-button
            v-if="row.hasChildren"
            class="tree-arrow"
            :class="{ expanded: row.expanded }"
            :aria-label="row.expanded ? '收起子分类' : '展开子分类'"
            @click.stop="toggle(row.node.id)"
          >
            <span aria-hidden="true" />
          </el-button>
          <span v-else class="tree-arrow placeholder"></span>
          <span class="tree-label">{{ row.node.name }}</span>
        </div>
      </template>
      <p v-if="keyword && !rows.length" class="empty-tip">未找到匹配分类</p>
    </div>

    <!-- 批注（2026-11-20）：范围单选与总数允许由页面挪到底部工具条，这里用开关保留兼容（课程管理页仍在侧栏用） -->
    <footer v-if="showFooter" class="tree-footer">
      <div class="scope-options">
        <el-radio-group v-model="scope">
          <el-radio :value="1">包含子分类</el-radio>
          <el-radio :value="0">仅当前分类</el-radio>
        </el-radio-group>
      </div>
      <div class="tree-total">共 {{ total }} 条</div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { Fold, Search } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import type { KngTreeNode } from '@/api/kng'

const props = withDefaults(defineProps<{
  tree: KngTreeNode[]
  modelValue: string
  includeChildCatalog: number
  total: number
  /** 是否在侧栏底部显示「包含子分类/仅当前分类 + 共 N 条」；课件页把它挪到了内容区底部分页行 */
  showFooter?: boolean
}>(), {
  modelValue: '',
  includeChildCatalog: 1,
  showFooter: true,
  total: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:includeChildCatalog': [value: number]
  change: []
  collapse: []
}>()

interface FlatRow {
  node: KngTreeNode
  depth: number
  hasChildren: boolean
  expanded: boolean
}

const keyword = ref('')
const rootExpanded = ref(true)
const expanded = ref(new Set<string>())

const scope = computed({
  get: () => props.includeChildCatalog,
  set: (value: number) => emit('update:includeChildCatalog', value)
})

const allNodes = computed(() => {
  const result: KngTreeNode[] = []
  const walk = (nodes: KngTreeNode[]) => {
    for (const node of nodes) {
      result.push(node)
      walk(node.children ?? [])
    }
  }
  walk(props.tree)
  return result
})

const parentById = computed(() => {
  const result = new Map<string, string>()
  const walk = (nodes: KngTreeNode[]) => {
    for (const node of nodes) {
      for (const child of node.children ?? []) result.set(child.id, node.id)
      walk(node.children ?? [])
    }
  }
  walk(props.tree)
  return result
})

const visibleIds = computed(() => {
  const needle = keyword.value.trim()
  if (!needle) return null
  const result = new Set<string>()
  for (const node of allNodes.value) {
    if (!node.name.includes(needle)) continue
    result.add(node.id)
    let parent = parentById.value.get(node.id)
    while (parent) {
      result.add(parent)
      parent = parentById.value.get(parent)
    }
  }
  return result
})

const rows = computed<FlatRow[]>(() => {
  const result: FlatRow[] = []
  const searching = Boolean(visibleIds.value)
  const walk = (nodes: KngTreeNode[], depth: number) => {
    for (const node of nodes) {
      if (searching && !visibleIds.value?.has(node.id)) continue
      const hasChildren = Boolean(node.children?.length)
      const open = searching || expanded.value.has(node.id)
      result.push({ node, depth, hasChildren, expanded: open })
      if (open) walk(node.children ?? [], depth + 1)
    }
  }
  walk(props.tree, 0)
  return result
})

const toggle = (id: string) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

const toggleRoot = () => {
  rootExpanded.value = !rootExpanded.value
}

const select = (id: string) => {
  emit('update:modelValue', id)
  emit('change')
}

watch(() => props.tree, tree => {
  const next = new Set(expanded.value)
  for (const node of tree) {
    if (!next.size) next.add(node.id)
  }
  expanded.value = next
}, { immediate: true })
</script>

<style scoped lang="scss">
.catalog-tree-panel {
  width: 250px;
  min-width: 250px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper);
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 12px 10px;
}

.tree-search {
  min-width: 0;
  flex: 1;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 6px;
  color: var(--color-muted);

  input {
    min-width: 0;
    flex: 1;
    color: var(--color-ink-2);
    font-size: 13px;
  }

  /* 原生 input 的 outline 已去掉：焦点时在包裹层补可见焦点环（无尺寸位移） */
  &:focus-within {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-accent) 18%, transparent);
  }
}

.collapse-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-size: 20px;
  cursor: pointer;
}

.tree-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
}

.tree-row {
  min-height: 36px;
  display: flex;
  align-items: center;
  padding-right: 8px;
  border-radius: 6px;
  color: var(--color-ink-2);
  font-size: 13px;
  cursor: pointer;

  /* 自定义可点分类行：键盘可达，补可见焦点环（不占布局空间） */
  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  &:hover {
    background: var(--color-paper-2);
  }

  &.selected {
    background: var(--color-accent-wash);
    color: var(--color-accent-deep);
    font-weight: 600;
  }
}

.root-row {
  font-weight: 600;
}

.tree-arrow {
  width: 22px;
  height: 28px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  span {
    width: 0;
    height: 0;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid var(--color-muted);
    transition: transform 0.15s ease;
  }

  &.expanded span {
    transform: rotate(90deg);
  }

  &.placeholder {
    cursor: default;
  }
}

.tree-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tip {
  padding: 36px 12px;
  color: var(--color-muted);
  text-align: center;
  font-size: 13px;
}

.tree-footer {
  flex-shrink: 0;
  padding: 14px 16px 16px;
  border-top: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-size: 12px;
}

.scope-options {
  display: flex;
  flex-direction: column;
  gap: 10px;

  label {
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
  }

  input {
    accent-color: var(--color-accent);
  }
}

.tree-total {
  margin-top: 14px;
  color: var(--color-muted);
}
</style>
