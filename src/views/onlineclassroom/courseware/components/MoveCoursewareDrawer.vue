<template>
  <KngDrawer
    :visible="visible"
    title="移动"
    :width="760"
    :z-index="4100"
    @close="emit('close')"
  >
    <div class="move-body">
      <h4>请选择课堂</h4>
      <el-select v-model="classroom" class="classroom-select">
        <el-option label="主课堂" value="main" />
      </el-select>

      <h4>请选择分类</h4>
      <el-input
        v-model.trim="keyword"
        class="tree-search"
        placeholder="请输入课程分类名称搜索"
        clearable
      >
        <template #prefix><span aria-hidden="true"><el-icon><Search /></el-icon></span></template>
      </el-input>
      <div class="tree-wrap">
        <div
          class="tree-row root-row"
          :class="{ selected: selectedId === '' }"
          role="button"
          tabindex="0"
          @click="selectedId = ''"
          @keydown.enter.prevent="selectedId = ''"
        >
          <span class="expand-placeholder"></span>
          <span>主课堂</span>
        </div>
        <div
          v-for="row in rows"
          :key="row.node.id"
          class="tree-row"
          :class="{ selected: selectedId === row.node.id }"
          :style="{ paddingLeft: `${row.depth * 22}px` }"
          role="button"
          tabindex="0"
          @click="selectedId = row.node.id"
          @keydown.enter.prevent="selectedId = row.node.id"
        >
          <el-button
            v-if="row.hasChildren"
            class="expand-btn"
            :aria-label="row.expanded ? '收起子分类' : '展开子分类'"
            @click.stop="toggle(row.node.id)"
          >
            <el-icon class="fold" v-if="row.expanded"><CaretBottom /></el-icon><el-icon class="fold" v-else><CaretRight /></el-icon>
          </el-button>
          <span v-else class="expand-placeholder"></span>
          <span>{{ row.node.name }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button class="btn" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" :disabled="!selectedId" @click="emit('confirm', selectedId)">
        确定
      </el-button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { CaretBottom, CaretRight, Search } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
import KngDrawer from '../../components/KngDrawer.vue'
import { getKngCatalogTree, type KngTreeNode } from '@/api/kng'

const props = defineProps<{
  visible: boolean
  coursewares: string[]
}>()

const emit = defineEmits<{
  close: []
  confirm: [targetCatalogId: string]
}>()

const classroom = ref('main')
const tree = ref<KngTreeNode[]>([])
const keyword = ref('')
const selectedId = ref('')
const expanded = ref(new Set<string>())
const rows = ref<Array<{
  node: KngTreeNode
  depth: number
  hasChildren: boolean
  expanded: boolean
}>>([])

const parentMap = new Map<string, string>()

function matchedIds() {
  const needle = keyword.value.trim()
  if (!needle) return null
  parentMap.clear()
  const walkParents = (nodes: KngTreeNode[]) => {
    for (const node of nodes) {
      for (const child of node.children ?? []) parentMap.set(child.id, node.id)
      walkParents(node.children ?? [])
    }
  }
  walkParents(tree.value)
  const result = new Set<string>()
  const walk = (nodes: KngTreeNode[]) => {
    for (const node of nodes) {
      if (node.name.includes(needle)) {
        result.add(node.id)
        let parent = parentMap.get(node.id)
        while (parent) {
          result.add(parent)
          parent = parentMap.get(parent)
        }
      }
      walk(node.children ?? [])
    }
  }
  walk(tree.value)
  return result
}

function rebuildRows() {
  const matched = matchedIds()
  const result: typeof rows.value = []
  const walk = (nodes: KngTreeNode[], depth: number) => {
    for (const node of nodes) {
      if (matched && !matched.has(node.id)) continue
      const hasChildren = Boolean(node.children?.length)
      const open = Boolean(matched) || expanded.value.has(node.id)
      result.push({ node, depth, hasChildren, expanded: open })
      if (open) walk(node.children ?? [], depth + 1)
    }
  }
  walk(tree.value, 0)
  rows.value = result
}

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
  rebuildRows()
}

watch(keyword, rebuildRows)
watch(() => props.visible, async visible => {
  if (!visible) return
  tree.value = await getKngCatalogTree()
  selectedId.value = ''
  keyword.value = ''
  expanded.value = new Set(tree.value.filter(node => Boolean(node.children?.length)).map(node => node.id))
  rebuildRows()
}, { immediate: true })
</script>

<style scoped lang="scss">
.move-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h4 {
  margin: 0;
  padding-left: 9px;
  border-left: 3px solid #2e7cf6;
  color: #30384a;
  font-size: 15px;
}

.classroom-select,
.tree-search {
  width: 100%;
}

.classroom-select :deep(.el-select__wrapper),
.tree-search :deep(.el-input__wrapper) {
  min-height: 38px;
  border-radius: 6px;
}

.tree-wrap {
  min-height: 390px;
  max-height: 52vh;
  overflow: auto;
}

.tree-row {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  /* 自定义可点分类行：键盘可达，补可见焦点环（不占布局空间） */
  &:focus-visible {
    outline: 2px solid #2e7cf6;
    outline-offset: -2px;
  }

  &:hover {
    background: #f5f8fc;
  }

  &.selected {
    background: #eaf2ff;
    color: #1f6fe8;
    font-weight: 600;
  }
}

.root-row {
  margin-bottom: 4px;
  border-bottom: 1px solid #edf0f5;
}

.expand-btn,
.expand-placeholder {
  width: 22px;
  flex: 0 0 22px;
}

.expand-btn {
  height: 26px;
  border: none;
  background: transparent;
  color: #7b8496;
  cursor: pointer;
}

.btn {
  height: 36px;
  padding: 0 20px;
  border: 1px solid #d9deea;
  border-radius: 6px;
  background: #fff;
  color: #4d5568;
  cursor: pointer;

  &.primary {
    border-color: #2e7cf6;
    background: #2e7cf6;
    color: #fff;

    &:disabled {
      border-color: #cbd3df;
      background: #cbd3df;
      cursor: not-allowed;
    }
  }
}

.fold { vertical-align: -2px; margin-left: 2px; }
</style>
