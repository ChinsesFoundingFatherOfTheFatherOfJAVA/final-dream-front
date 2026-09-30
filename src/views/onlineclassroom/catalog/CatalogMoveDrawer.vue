<template>
  <KngDrawer
    :visible="visible"
    :title="mode === 'courses' ? '移动此分类下的课程' : '移动此分类（含课程）'"
    :width="660"
    :z-index="3100"
    @close="emit('close')"
  >
    <div class="move-form">
      <label class="form-row">
        <span>待移动分类</span>
        <input :value="catalogPath" readonly />
      </label>
      <div class="notice">被共享的课件暂不支持移动</div>
      <label class="form-row">
        <span>移动至</span>
        <input v-model.trim="keyword" placeholder="搜索目标分类" />
      </label>

      <div class="target-tree">
        <label class="tree-row root-row">
          <input v-model="targetId" type="radio" :value="null" />
          <strong>主课堂</strong>
        </label>
        <div
          v-for="row in targetRows"
          :key="row.id"
          class="tree-row"
          :style="{ paddingLeft: `${row.depth * 18}px` }"
        >
          <button
            v-if="row.hasChildren"
            type="button"
            class="expand-btn"
            :aria-label="row.expanded ? '收起子分类' : '展开子分类'"
            :aria-expanded="row.expanded"
            @click.stop="toggleExpand(row.id)"
          >
            {{ row.expanded ? '▾' : '▸' }}
          </button>
          <span v-else class="expand-placeholder"></span>
          <label class="tree-label">
            <input v-model="targetId" type="radio" :value="row.id" />
            <span>{{ row.name }}</span>
          </label>
        </div>
        <div v-if="!targetRows.length" class="empty-tip">暂无匹配分类</div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn ghost" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" :disabled="saving" @click="submit">
        {{ saving ? '处理中...' : '确定' }}
      </button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KngDrawer from '../components/KngDrawer.vue'
import { getKngCatalogTree, moveKngCatalog, type KngTreeNode } from '@/api/kng'
import { toast } from '@/utils/toast'

const props = withDefaults(defineProps<{
  visible: boolean
  mode: 'tree' | 'courses'
  catalog: KngTreeNode | null
  catalogPath: string
}>(), {
  catalog: null,
  catalogPath: ''
})

const emit = defineEmits<{
  close: []
  saved: []
}>()

const tree = ref<KngTreeNode[]>([])
const keyword = ref('')
const targetId = ref<string | null>(null)
const saving = ref(false)
const expandedIds = ref(new Set<string>())

const descendantIds = (node: KngTreeNode | null): Set<string> => {
  const ids = new Set<string>()
  const walk = (item: KngTreeNode) => {
    ids.add(item.id)
    item.children?.forEach(walk)
  }
  if (node) walk(node)
  return ids
}

const filteredTree = computed(() => {
  const excluded = props.mode === 'tree' ? descendantIds(props.catalog) : new Set<string>()
  const needle = keyword.value.trim()
  const filterNodes = (nodes: KngTreeNode[]): KngTreeNode[] => nodes.flatMap(node => {
    if (excluded.has(node.id)) return []
    const children = filterNodes(node.children ?? [])
    if (!needle || node.name.includes(needle) || children.length) {
      return [{ ...node, children }]
    }
    return []
  })
  return filterNodes(tree.value)
})

const targetRows = computed(() => {
  const rows: Array<KngTreeNode & { depth: number; hasChildren: boolean; expanded: boolean }> = []
  const searching = Boolean(keyword.value.trim())
  const walk = (nodes: KngTreeNode[], depth: number) => {
    for (const node of nodes) {
      const hasChildren = Boolean(node.children?.length)
      const expanded = searching || expandedIds.value.has(node.id)
      rows.push({ ...node, depth, hasChildren, expanded })
      if (hasChildren && expanded) {
        walk(node.children ?? [], depth + 1)
      }
    }
  }
  walk(filteredTree.value, 0)
  return rows
})

const toggleExpand = (id: string) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const submit = async () => {
  if (!props.catalog) return
  saving.value = true
  try {
    const result = await moveKngCatalog(props.catalog.id, targetId.value, props.mode === 'courses')
    toast.info(props.mode === 'courses'
      ? `已移动 ${result.count} 条课程`
      : `已移动 ${result.count} 个分类节点`)
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}

watch(() => props.visible, async visible => {
  if (!visible) return
  targetId.value = null
  keyword.value = ''
  expandedIds.value = new Set()
  tree.value = await getKngCatalogTree()
}, { immediate: true })
</script>

<style scoped lang="scss">
.move-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 10px;
  color: #4d5568;
  font-size: 13px;

  input {
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    outline: none;
  }
}

.notice {
  padding: 10px 12px;
  border: 1px solid #cfe0ff;
  border-radius: 6px;
  background: #f2f7ff;
  color: #2e6dc4;
  font-size: 12px;
}

.target-tree {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  padding: 10px;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  color: #394253;
  font-size: 13px;

  &:hover {
    border-radius: 6px;
    background: #f8fafc;
  }
}

.root-row {
  border-bottom: 1px solid #eef1f6;
  margin-bottom: 4px;
}

.expand-btn,
.expand-placeholder {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.expand-btn {
  border: none;
  background: transparent;
  color: #7a8396;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.tree-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  cursor: pointer;
}

.empty-tip {
  padding: 20px;
  color: #98a1b2;
  text-align: center;
  font-size: 13px;
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;

  &.ghost {
    border: 1px solid #d9deea;
    background: #fff;
    color: #596274;
  }

  &.primary {
    border: none;
    background: #e75487;
    color: #fff;
  }
}
</style>
