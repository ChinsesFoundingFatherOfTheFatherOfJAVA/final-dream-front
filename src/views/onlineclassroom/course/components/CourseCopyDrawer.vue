<template>
  <KngDrawer
    :visible="visible"
    title="复制课程"
    :width="780"
    :z-index="4100"
    @close="emit('close')"
  >
    <div class="copy-body">
      <div class="notice">
        <span aria-hidden="true">i</span>
        复制出一个新课程，源课程与复制课程各自独立，章节任务结构完整复制，编辑时不会同步更新
      </div>
      <h4>请选择目录</h4>
      <div class="tree-wrap">
        <div class="tree-head">
          <el-button v-if="rootExpanded" aria-label="收起子分类" @click="rootExpanded = false"><el-icon><CaretBottom /></el-icon></el-button>
          <el-button v-else aria-label="展开子分类" @click="rootExpanded = true"><el-icon><CaretRight /></el-icon></el-button>
          <strong>主课堂</strong>
        </div>
        <template v-if="rootExpanded">
          <div
            v-for="row in rows"
            :key="row.node.id"
            class="tree-row"
            :style="{ paddingLeft: `${22 + row.depth * 24}px` }"
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
            <el-checkbox
              :model-value="selectedId === row.node.id"
              @change="selectedId = selectedId === row.node.id ? '' : row.node.id"
            >
              {{ row.node.name }}
            </el-checkbox>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <el-button class="btn" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" :disabled="!selectedId" @click="confirm">确定</el-button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { CaretBottom, CaretRight } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
import KngDrawer from '../../components/KngDrawer.vue'
import { getKngCatalogTree, type KngTreeNode } from '@/api/kng'
import type { CourseListItem } from '@/api/course'

/** 课程复制抽屉（CS-09）：结构同课件复制抽屉，选择目标分类后生成"-副本"未发布课程 */
const props = defineProps<{
  visible: boolean
  course: CourseListItem | null
}>()

const emit = defineEmits<{
  close: []
  confirm: [targetCatalogId: string]
}>()

const tree = ref<KngTreeNode[]>([])
const rootExpanded = ref(true)
const expanded = ref(new Set<string>())
const selectedId = ref('')

const rows = ref<Array<{
  node: KngTreeNode
  depth: number
  hasChildren: boolean
  expanded: boolean
}>>([])

function rebuildRows() {
  const result: typeof rows.value = []
  const walk = (nodes: KngTreeNode[], depth: number) => {
    for (const node of nodes) {
      const hasChildren = Boolean(node.children?.length)
      const open = expanded.value.has(node.id)
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

function confirm() {
  if (selectedId.value) emit('confirm', selectedId.value)
}

watch(() => props.visible, async visible => {
  if (!visible) return
  tree.value = await getKngCatalogTree()
  selectedId.value = props.course?.catalogId || ''
  expanded.value = new Set(tree.value.filter(node => Boolean(node.children?.length)).map(node => node.id))
  rebuildRows()
}, { immediate: true })
</script>

<style scoped lang="scss">
.copy-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 6px;
  background: var(--color-accent-wash);
  color: var(--color-muted);
  font-size: 13px;

  span {
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--color-accent);
    color: var(--color-accent-ink);
    font-family: Georgia, serif;
    font-size: 12px;
  }
}

h4 {
  margin: 0;
  padding-left: 10px;
  border-left: 3px solid var(--color-accent);
  color: var(--color-ink);
  font-size: 15px;
}

.tree-wrap {
  min-height: 400px;
  max-height: 56vh;
  overflow: auto;
  padding: 4px 0;
}

.tree-head,
.tree-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-ink-2);
  font-size: 13px;
}

.tree-head button,
.expand-btn {
  width: 24px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
}

.expand-placeholder {
  width: 24px;
}

.tree-row :deep(.el-checkbox) {
  margin-right: 0;
}

.btn {
  height: 36px;
  padding: 0 20px;
  border: 1px solid var(--color-rule-2);
  border-radius: 6px;
  background: var(--color-paper);
  color: var(--color-ink-2);
  cursor: pointer;

  &.primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-ink);

    &:disabled {
      border-color: var(--color-rule-2);
      background: var(--color-rule-2);
      cursor: not-allowed;
    }
  }
}

.fold { vertical-align: -2px; margin-left: 2px; }
</style>
