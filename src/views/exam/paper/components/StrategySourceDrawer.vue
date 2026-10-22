<template>
  <!-- FP-09 设置抽题来源（截图07/08/10）：
       按题库 = 勾题库；按考核点 = 题库可展开选考核点，支持跨库多选，右侧按库分组的已选 tag -->
    <el-drawer
    :model-value="true"
    size="880px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>设置抽题来源</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="mode-row">
          <label class="mode-radio">
            <el-radio v-model.number="sourceType" :value="0" />
            <span>按题库</span>
          </label>
          <label class="mode-radio">
            <el-radio v-model.number="sourceType" :value="1" />
            <span>按考核点</span>
          </label>
          <span v-if="sourceType === 1" class="hint">按考核点时，未勾选考核点表示该库全部考核点</span>
        </div>

        <div class="toolbar">
          <el-select v-model="catalogFilter" class="catalog-filter">
            <el-option value="" label="分类" />
            <el-option v-for="c in catalogs" :key="c.id" :value="c.id" :label="c.name" />
          </el-select>
          <el-input v-model.trim="keyword" placeholder="题库/考核点" />
        </div>

        <div class="main-area">
          <!-- 左：题库（按考核点时题库可展开出考核点） -->
          <div class="tree-list">
            <template v-for="lib in visibleLibs" :key="lib.id">
              <div class="lib-row" :class="{ picked: isLibPicked(lib.id) }">
                <span v-if="sourceType === 1"
                      class="expand-arrow" :class="{ expanded: expanded.has(lib.id) }"
                      @click.stop="toggleExpand(lib.id)">›</span>
                <span v-else class="expand-placeholder"></span>

                <el-checkbox :model-value="isLibPicked(lib.id)"
                       @change="toggleLib(lib.id, Boolean($event))" />
                <span class="lib-name" @click="toggleLib(lib.id, !isLibPicked(lib.id))">{{ lib.name }}</span>
                <span class="lib-cat">{{ lib.catalogName }}</span>
              </div>

              <!-- 展开的考核点（跨库多选） -->
              <template v-if="sourceType === 1 && expanded.has(lib.id)">
                <div v-for="point in pointsOf(lib.id)" :key="point.id" class="point-row">
                  <el-checkbox :model-value="pickedPoints.has(point.id)"
                         @change="togglePoint(lib.id, point.id, Boolean($event))" />
                  <span class="point-name">{{ point.name }}</span>
                </div>
                <p v-if="!loadingPoints.has(lib.id) && !pointsOf(lib.id).length" class="point-empty">
                  该库还没有考核点
                </p>
              </template>
            </template>
            <p v-if="!visibleLibs.length" class="empty">没有可选题库</p>
          </div>

          <!-- 右：已选 -->
          <aside class="picked-panel">
            <div class="picked-head">
              <span>已选</span>
              <span class="clear-btn" @click="clearAll">清空</span>
            </div>

            <!-- 按题库 -->
            <div v-if="sourceType === 0" class="picked-body">
              <span v-for="id in Array.from(pickedLibs)" :key="id" class="picked-tag">
                {{ nameOf(id) }}<i @click="toggleLib(id, false)">×</i>
              </span>
              <span v-if="!pickedLibs.size" class="empty-tip">请在左侧勾选题库</span>
            </div>

            <!-- 按考核点：按库分组 -->
            <div v-else class="picked-body">
              <div v-for="group in pickedGroups" :key="group.libId" class="picked-group">
                <p class="group-name">{{ group.libName }}</p>
                <div class="group-tags">
                  <span v-for="p in group.points" :key="p.id" class="picked-tag">
                    {{ p.name }}<i @click="togglePoint(group.libId, p.id, false)">×</i>
                  </span>
                </div>
              </div>
              <span v-if="!pickedPoints.size" class="empty-tip">请展开题库勾选考核点</span>
            </div>
          </aside>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!hasPicked || saving" @click="confirm">
          {{ saving ? '保存中…' : '确定' }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { toast } from '@/utils/toast'
import { getCatalogTree, getLibList, getPointList, type CatalogTreeNode, type LibItem, type PointItem } from '@/api/exam'
import { setPaperStrategySource } from '@/api/paper'

const props = defineProps<{
  paperId: string
  /** 已有来源（编辑时回填）：按题库给 libIds，按考核点给 pointIds */
  initialLibIds?: string[]
  initialPointIds?: string[]
  initialSourceType?: number
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const libs = ref<LibItem[]>([])
const catalogs = ref<CatalogTreeNode[]>([])
const points = reactive<Record<string, PointItem[]>>({})
const loadingPoints = reactive(new Set<string>())
const expanded = reactive(new Set<string>())

const pickedLibs = ref(new Set<string>(props.initialLibIds ?? []))
const pickedPoints = ref(new Set<string>(props.initialPointIds ?? []))
const libOfPoint = reactive<Record<string, string>>({})

const sourceType = ref(props.initialSourceType ?? 0)
const catalogFilter = ref('')
const keyword = ref('')
const saving = ref(false)

const visibleLibs = computed(() =>
  libs.value.filter(lib => {
    if (catalogFilter.value && lib.catalogId !== catalogFilter.value) return false
    if (!keyword.value) return true
    if (lib.name.includes(keyword.value)) return true
    return (points[lib.id] ?? []).some(p => p.name.includes(keyword.value))
  }))

const hasPicked = computed(() =>
  sourceType.value === 0 ? pickedLibs.value.size > 0 : pickedPoints.value.size > 0)

/** 按考核点模式：已选按题库分组（同一张卷可跨库选多个考点）。 */
const pickedGroups = computed(() => {
  const groups = new Map<string, { libId: string; libName: string; points: PointItem[] }>()
  for (const pid of pickedPoints.value) {
    const libId = libOfPoint[pid]
    if (!libId) continue
    if (!groups.has(libId)) {
      groups.set(libId, { libId, libName: nameOf(libId), points: [] })
    }
    const point = (points[libId] ?? []).find(p => p.id === pid)
    if (point) groups.get(libId)!.points.push(point)
  }
  return Array.from(groups.values())
})

const nameOf = (id: string) => libs.value.find(l => l.id === id)?.name ?? id
const pointsOf = (libId: string) => points[libId] ?? []

const isLibPicked = (libId: string) => sourceType.value === 0
  ? pickedLibs.value.has(libId)
  : pointsOf(libId).length > 0 && pointsOf(libId).every(p => pickedPoints.value.has(p.id))

const loadPoints = async (libId: string) => {
  if (points[libId] || loadingPoints.has(libId)) return
  loadingPoints.add(libId)
  try {
    const list = await getPointList(libId)
    points[libId] = list || []
    for (const p of points[libId]) libOfPoint[p.id] = libId
  } finally {
    loadingPoints.delete(libId)
  }
}

const toggleExpand = async (libId: string) => {
  if (expanded.has(libId)) expanded.delete(libId)
  else {
    expanded.add(libId)
    await loadPoints(libId)
  }
}

const toggleLib = async (libId: string, checked: boolean) => {
  if (sourceType.value === 0) {
    const next = new Set(pickedLibs.value)
    if (checked) next.add(libId)
    else next.delete(libId)
    pickedLibs.value = next
    return
  }
  // 按考核点：勾整库 = 勾该库全部考核点
  await loadPoints(libId)
  const next = new Set(pickedPoints.value)
  for (const p of pointsOf(libId)) {
    if (checked) next.add(p.id)
    else next.delete(p.id)
  }
  pickedPoints.value = next
  if (checked) expanded.add(libId)
}

const togglePoint = (libId: string, pointId: string, checked: boolean) => {
  libOfPoint[pointId] = libId
  const next = new Set(pickedPoints.value)
  if (checked) next.add(pointId)
  else next.delete(pointId)
  pickedPoints.value = next
}

const clearAll = () => {
  pickedLibs.value = new Set()
  pickedPoints.value = new Set()
}

const confirm = async () => {
  saving.value = true
  try {
    const payloadLibs = sourceType.value === 0
      ? Array.from(pickedLibs.value).map(libId => ({ libId, pointIds: [] as string[] }))
      // 按考核点：按库聚合已选考点
      : Array.from(new Set(Array.from(pickedPoints.value)
        .map(pid => libOfPoint[pid] as string | undefined)
        .filter((id): id is string => !!id)))
        .map(libId => ({
          libId,
          pointIds: Array.from(pickedPoints.value).filter(pid => libOfPoint[pid] === libId)
        }))

    await setPaperStrategySource(props.paperId, { sourceType: sourceType.value, libs: payloadLibs })
    toast.success('抽题来源已保存')
    emit('saved')
    emit('close')
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getLibList(1, 500, 'updateTime', 'desc', {
      queryType: 0, keyword: '', catalogId: 'root', routingPath: '',
      creatorUserId: '', disabled: 0
    })
    libs.value = res.records || []
  } catch { /* 拦截器已提示 */ }
  try {
    const tree = await getCatalogTree() as CatalogTreeNode
    const flat: CatalogTreeNode[] = []
    const walk = (n: CatalogTreeNode) => { flat.push(n); (n.children || []).forEach(walk) }
    walk(tree)
    catalogs.value = flat
  } catch { /* 拦截器已提示 */ }

  // 回填：按考核点模式先把已选考点所属库的考核点拉出来，右侧分组才有名字
  if (sourceType.value === 1 && (props.initialPointIds?.length ?? 0) > 0) {
    for (const lib of libs.value) {
      await loadPoints(lib.id)
    }
  }
})

// radios 变化时清空另一侧选择（避免按题库/按考核点混着提交）
watch(sourceType, (next, prev) => {
  if (next === prev) return
  if (next === 0) pickedPoints.value = new Set()
  else pickedLibs.value = new Set()
})
</script>

<style scoped lang="scss">
.drawer { width: 880px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 500;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 20px; gap: 12px; }

.mode-row {
  display: flex; align-items: center; gap: 20px;

  .mode-radio {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #4a5368; cursor: pointer;
    input { margin: 0; accent-color: #1890ff; }
  }
  .hint { font-size: 12px; color: #8a92a5; }
}

.toolbar {
  display: flex; gap: 12px;

  .catalog-filter {
    width: 200px; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 7px 10px; font-size: 13px; outline: none;
  }
  input {
    flex: 1; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 7px 10px; font-size: 13px; outline: none;

    &:focus { border-color: #1890ff; }
  }
}

.main-area { flex: 1; min-height: 0; display: flex; gap: 16px; }

.tree-list {
  flex: 1; min-width: 0; overflow-y: auto; border: 1px solid #eef1f6; border-radius: 6px; padding: 6px 0;
}

.lib-row {
  display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px; color: #4a5368;

  &:hover { background: #f7faff; }
  &.picked { background: #f2f8ff; }

  .expand-arrow {
    width: 14px; text-align: center; color: #a0a7b8; cursor: pointer; transition: transform .15s;
    &.expanded { transform: rotate(90deg); }
  }
  .expand-placeholder { width: 14px; }
  .lib-name { flex: 1; min-width: 0; cursor: pointer; }
  .lib-cat { color: #8a92a5; font-size: 12px; }
  input[type="checkbox"] { accent-color: #1890ff; }
}

.point-row {
  display: flex; align-items: center; gap: 8px; padding: 7px 14px 7px 44px;
  font-size: 13px; color: #4a5368;

  &:hover { background: #f7faff; }
  input[type="checkbox"] { accent-color: #1890ff; }
}

.point-empty { margin: 4px 0 4px 44px; font-size: 12px; color: #b0b7c3; }

.picked-panel {
  flex: 0 0 280px; border: 1px solid #eef1f6; border-radius: 6px;
  display: flex; flex-direction: column; padding: 12px 14px;

  .picked-head {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; color: #303133; margin-bottom: 10px;
  }
  .clear-btn { color: #1890ff; cursor: pointer; &:hover { text-decoration: underline; } }
}

.picked-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 8px; }

.picked-group { width: 100%; margin-bottom: 10px; }
.group-name { margin: 0 0 6px; font-size: 13px; color: #303133; }
.group-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.picked-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 8px; border: 1px solid #d9e1ec; border-radius: 4px;
  background: #fafbfd; font-size: 12px; color: #4a5368;

  i { font-style: normal; color: #a0a7b8; cursor: pointer; &:hover { color: #f5222d; } }
}

.empty, .empty-tip { font-size: 12px; color: #b0b7c3; }

.drawer-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid #eee;
}

.btn {
  padding: 7px 22px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
