<template>
  <KngDrawer
    :visible="visible"
    title="添加用户权限"
    subtitle="选择部门、岗位或角色作为授权对象"
    :width="780"
    :z-index="3200"
    @close="emit('close')"
  >
    <div class="picker-layout">
      <section class="picker-main">
        <div class="tab-line">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeTab === tab.value }"
            @click="switchTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="picker-filter">
          <input v-model.trim="keyword" type="search" :placeholder="placeholder" @keyup.enter="loadCurrent" />
          <button type="button" @click="loadCurrent">查询</button>
        </div>

        <div v-if="activeTab === 'dept'" class="subject-list dept-list">
          <label v-for="row in deptRows" :key="row.id" class="subject-row">
            <input
              type="checkbox"
              :checked="selected.has(subjectKey(4, row.id))"
              @change="toggle({ subjectType: 4, subjectId: row.id, subjectName: row.name, permCodes: [] })"
            />
            <span :style="{ paddingLeft: `${row.depth * 18}px` }">{{ row.name }}</span>
            <small>{{ row.userCount }}人</small>
          </label>
          <div v-if="!deptRows.length" class="empty-tip">暂无部门数据</div>
        </div>

        <div v-else class="subject-list">
          <label v-for="row in pagedRows" :key="row.key" class="subject-row">
            <input
              type="checkbox"
              :checked="selected.has(row.key)"
              @change="toggle(row.item)"
            />
            <span>{{ row.item.subjectName }}</span>
            <small v-if="row.remark" class="remark" :title="row.remark">{{ row.remark }}</small>
            <small>{{ row.count }}人</small>
          </label>
          <div v-if="!pagedRows.length" class="empty-tip">暂无数据</div>
          <div class="pager">
            <span>共 {{ total }} 条</span>
            <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
            <span>{{ page }} / {{ totalPages }}</span>
            <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
          </div>
        </div>
      </section>

      <aside class="selected-panel">
        <h4>已选 {{ selectedItems.length }} 项</h4>
        <div v-if="!selectedItems.length" class="empty-tip">尚未选择</div>
        <div v-for="item in selectedItems" :key="item.key" class="selected-row">
          <span>{{ item.item.subjectName }}</span>
          <button type="button" @click="removeSelection(item.key)">×</button>
        </div>
      </aside>
    </div>

    <template #footer>
      <button type="button" class="btn ghost" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" @click="confirm">确定</button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KngDrawer from '../components/KngDrawer.vue'
import {
  getKngDeptTree,
  getKngPositions,
  getKngRoles,
  type KngDeptNode,
  type KngPermissionItem
} from '@/api/kng'

const props = withDefaults(defineProps<{
  visible: boolean
  existing?: KngPermissionItem[]
}>(), {
  existing: () => []
})

const emit = defineEmits<{
  close: []
  confirm: [items: KngPermissionItem[]]
}>()

const tabs = [
  { value: 'dept', label: '部门' },
  { value: 'position', label: '岗位' },
  { value: 'role', label: '角色' }
] as const

const activeTab = ref<'dept' | 'position' | 'role'>('dept')
const keyword = ref('')
const deptTree = ref<KngDeptNode[]>([])
const selectedMap = ref(new Map<string, KngPermissionItem>())
const pagedRows = ref<Array<{ key: string; item: KngPermissionItem; count: number; remark?: string | null }>>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)

const subjectKey = (type: number, id: string | null) => `${type}:${id ?? 'null'}`
const selected = computed(() => new Set(selectedMap.value.keys()))
const selectedItems = computed(() => Array.from(selectedMap.value.entries()).map(([key, item]) => ({ key, item })))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const placeholder = computed(() => activeTab.value === 'dept'
  ? '搜索部门名称'
  : activeTab.value === 'position' ? '搜索岗位名称' : '搜索角色名称')

const filteredDeptTree = computed(() => {
  const needle = keyword.value.trim()
  if (!needle) return deptTree.value
  const filterNodes = (nodes: KngDeptNode[]): KngDeptNode[] => nodes.flatMap(node => {
    const children = filterNodes(node.children ?? [])
    if (node.name.includes(needle) || children.length) {
      return [{ ...node, children }]
    }
    return []
  })
  return filterNodes(deptTree.value)
})

const deptRows = computed(() => {
  const rows: Array<KngDeptNode & { depth: number }> = []
  const walk = (nodes: KngDeptNode[], depth: number) => {
    for (const node of nodes) {
      rows.push({ ...node, depth })
      walk(node.children ?? [], depth + 1)
    }
  }
  walk(filteredDeptTree.value, 0)
  return rows
})

const resetSelection = () => {
  const map = new Map<string, KngPermissionItem>()
  for (const item of props.existing ?? []) {
    if (item.subjectType < 4) continue
    map.set(subjectKey(item.subjectType, item.subjectId), { ...item, permCodes: [] })
  }
  selectedMap.value = map
}

const loadDept = async () => {
  deptTree.value = await getKngDeptTree()
}

const loadCurrent = async () => {
  page.value = 1
  if (activeTab.value === 'dept') {
    await loadDept()
    return
  }
  if (activeTab.value === 'position') {
    const data = await getKngPositions({ page: 1, pageSize, name: keyword.value || undefined })
    total.value = data.total
    pagedRows.value = data.records.map(row => ({
      key: subjectKey(5, row.name),
      item: { subjectType: 5, subjectId: row.name, subjectName: row.name, permCodes: [] },
      count: row.userCount
    }))
    return
  }
  const data = await getKngRoles({ page: 1, pageSize, name: keyword.value || undefined })
  total.value = data.total
  pagedRows.value = data.records.map(row => ({
    key: subjectKey(6, row.id),
    item: { subjectType: 6, subjectId: row.id, subjectName: row.name, permCodes: [] },
    count: row.userCount,
    remark: row.remark
  }))
}

const changePage = async (nextPage: number) => {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  if (activeTab.value === 'position') {
    const data = await getKngPositions({ page: page.value, pageSize, name: keyword.value || undefined })
    pagedRows.value = data.records.map(row => ({
      key: subjectKey(5, row.name),
      item: { subjectType: 5, subjectId: row.name, subjectName: row.name, permCodes: [] },
      count: row.userCount
    }))
  } else if (activeTab.value === 'role') {
    const data = await getKngRoles({ page: page.value, pageSize, name: keyword.value || undefined })
    pagedRows.value = data.records.map(row => ({
      key: subjectKey(6, row.id),
      item: { subjectType: 6, subjectId: row.id, subjectName: row.name, permCodes: [] },
      count: row.userCount,
      remark: row.remark
    }))
  }
}

const switchTab = async (tab: 'dept' | 'position' | 'role') => {
  activeTab.value = tab
  keyword.value = ''
  page.value = 1
  await loadCurrent()
}

const toggle = (item: KngPermissionItem) => {
  const key = subjectKey(item.subjectType, item.subjectId)
  const next = new Map(selectedMap.value)
  if (next.has(key)) next.delete(key)
  else next.set(key, { ...item, permCodes: [] })
  selectedMap.value = next
}

const removeSelection = (key: string) => {
  const next = new Map(selectedMap.value)
  next.delete(key)
  selectedMap.value = next
}

const confirm = () => {
  emit('confirm', Array.from(selectedMap.value.values()))
}

watch(
  () => props.visible,
  visible => {
    if (!visible) return
    resetSelection()
    activeTab.value = 'dept'
    keyword.value = ''
    page.value = 1
    void loadDept()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.picker-layout {
  min-height: 460px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 16px;
}

.picker-main,
.selected-panel {
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  overflow: hidden;
}

.tab-line {
  display: flex;
  border-bottom: 1px solid #e9edf4;

  button {
    flex: 1;
    height: 42px;
    border: none;
    background: #fff;
    color: #667085;
    cursor: pointer;

    &.active {
      color: #e75487;
      box-shadow: inset 0 -2px #e75487;
      font-weight: 600;
    }
  }
}

.picker-filter {
  display: flex;
  gap: 8px;
  padding: 12px;

  input {
    flex: 1;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    outline: none;
  }

  button {
    height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: #e75487;
    color: #fff;
    cursor: pointer;
  }
}

.subject-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 0 12px 12px;
}

.subject-row {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 36px;
  color: #394253;
  font-size: 13px;

  span {
    flex: 1;
  }

  small {
    color: #98a1b2;
  }

  .remark {
    max-width: 140px;
    overflow: hidden;
    color: #a5adbd;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.selected-panel {
  padding: 14px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
  }
}

.selected-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #eef1f6;
  color: #4d5568;
  font-size: 13px;

  button {
    border: none;
    background: transparent;
    color: #d94a4a;
    cursor: pointer;
  }
}

.empty-tip {
  padding: 18px 0;
  color: #98a1b2;
  text-align: center;
  font-size: 13px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-top: 12px;
  color: #7a8396;
  font-size: 12px;

  button {
    height: 30px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 5px;
    background: #fff;
    cursor: pointer;
  }
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
