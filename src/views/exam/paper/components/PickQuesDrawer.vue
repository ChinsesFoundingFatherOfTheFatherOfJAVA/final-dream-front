<template>
  <!-- FP-13 从题库选题抽屉（截图20）：选题库 → 勾选试题 → 建关联（不复制题目） -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>从题库选题</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <select v-model="libId" class="filter-select" @change="reload(1)">
            <option value="">选择题库</option>
            <option v-for="lib in libs" :key="lib.id" :value="lib.id">{{ lib.name }}</option>
          </select>
          <select v-model.number="type" class="filter-select" @change="reload(1)">
            <option :value="-1">全部题型</option>
            <option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)">{{ label }}</option>
          </select>
          <select v-model.number="levelType" class="filter-select" @change="reload(1)">
            <option :value="-1">全部难度</option>
            <option :value="0">易</option>
            <option :value="1">中</option>
            <option :value="2">难</option>
          </select>
          <input v-model.trim="keyword" type="search" placeholder="请输入试题名称搜索" @keyup.enter="reload(1)" />
          <button class="btn-primary" type="button" @click="reload(1)">查询</button>
        </div>

        <div class="main-area">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="check-col">
                    <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked"
                           @change="toggleAll(($event.target as HTMLInputElement).checked)" />
                  </th>
                  <th>试题名称</th><th class="col-sm">题型</th><th class="col-sm">难度</th>
                  <th class="col-point">考核点</th><th class="col-score">分值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in records" :key="row.id" :class="{ checked: picked.has(row.id) }">
                  <td class="check-col">
                    <input type="checkbox" :checked="picked.has(row.id)"
                           @change="toggle(row, ($event.target as HTMLInputElement).checked)" />
                  </td>
                  <td class="col-name" :title="row.summary">{{ row.summary }}</td>
                  <td class="col-sm">{{ TYPE_LABELS[row.type] ?? '--' }}</td>
                  <td class="col-sm">{{ LEVEL_LABELS[row.levelType] ?? '--' }}</td>
                  <td class="col-point" :title="row.mainPointName">{{ row.mainPointName || '--' }}</td>
                  <td class="col-score">
                    <input v-model.number="scores[row.id]" type="number" min="0" step="0.5" class="score-input" />
                  </td>
                </tr>
                <tr v-if="!loading && !records.length">
                  <td colspan="6" class="empty-cell">请先选择题库，或该题库下没有可选题</td>
                </tr>
              </tbody>
            </table>
          </div>

          <aside class="picked-panel">
            <p class="panel-title">已选: {{ picked.size }}</p>
            <div class="picked-list">
              <span v-for="item in pickedList" :key="item.id" class="picked-tag">
                {{ item.summary }}
                <i @click="unpick(item.id)">×</i>
              </span>
              <span v-if="!picked.size" class="empty-tip">请在左侧勾选试题</span>
            </div>
          </aside>
        </div>

        <div class="pagination">
          <span>共 {{ total }} 条</span>
          <button :disabled="pageNo <= 1" type="button" @click="reload(pageNo - 1)">‹</button>
          <span>{{ pageNo }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
          <button :disabled="pageNo >= Math.ceil(total / pageSize)" type="button" @click="reload(pageNo + 1)">›</button>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn" type="button" @click="emit('close')">取消</button>
        <button class="btn primary" type="button" :disabled="!picked.size || saving" @click="confirm">
          {{ saving ? '添加中…' : `确定（${picked.size} 题）` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getLibList, getQuesList, type LibItem, type QuesItem } from '@/api/exam'
import { pickPaperQuestions } from '@/api/paper'

const props = defineProps<{ paperId: string; defaultLibId?: string; defaultType?: number }>()
const emit = defineEmits<{ close: []; picked: [] }>()

const TYPE_LABELS: Record<number, string> = { 0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题' }
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }
const DEFAULT_SCORE = 1

const libs = ref<LibItem[]>([])
const libId = ref(props.defaultLibId || '')
const type = ref(props.defaultType ?? -1)
const levelType = ref(-1)
const keyword = ref('')
const records = ref<QuesItem[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 20
const loading = ref(false)
const saving = ref(false)
const picked = reactive(new Map<string, QuesItem>())
const scores = reactive<Record<string, number>>({})

const pickedList = computed(() => Array.from(picked.values()))
const allChecked = computed(() => records.value.length > 0 && records.value.every(r => picked.has(r.id)))
const someChecked = computed(() => records.value.some(r => picked.has(r.id)) && !allChecked.value)

const toggle = (row: QuesItem, checked: boolean) => {
  if (checked) {
    picked.set(row.id, row)
    if (scores[row.id] == null) scores[row.id] = DEFAULT_SCORE
  } else {
    picked.delete(row.id)
  }
}

const unpick = (quesId: string) => picked.delete(quesId)

const toggleAll = (checked: boolean) => {
  for (const row of records.value) toggle(row, checked)
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  if (!libId.value) {
    records.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const res = await getQuesList(pageNo.value, pageSize, 'updateTime', 'DESC', {
      libId: libId.value,
      keyword: keyword.value,
      type: type.value,
      levelType: levelType.value,
      disabled: -1,
      pointId: '',
      isDuplicate: 0
    })
    total.value = res.total || 0
    records.value = res.records || []
  } finally {
    loading.value = false
  }
}

const confirm = async () => {
  saving.value = true
  try {
    const items = Array.from(picked.values()).map(row => ({
      quesId: row.id,
      score: scores[row.id] ?? DEFAULT_SCORE,
      sectionIndex: row.type
    }))
    const res = await pickPaperQuestions(props.paperId, items)
    toast.success(`已添加 ${res.addedCount} 道试题`)
    emit('picked')
    emit('close')
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getLibList(1, 100, 'updateTime', 'desc', {
      queryType: 0, keyword: '', catalogId: '', routingPath: '', creatorUserId: '', disabled: -1
    })
    libs.value = res.records || []
    if (!libId.value && libs.value[0]) {
      libId.value = libs.value[0].id
    }
  } catch { /* 拦截器已提示 */ }
  reload(1)
})
</script>

<style scoped lang="scss">
.drawer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; justify-content: flex-end; z-index: 3250; }
.drawer { width: 980px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 14px 20px; }

.filter-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;

  .filter-select { border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; max-width: 160px; }
  input { flex: 1; min-width: 150px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 10px; font-size: 12px; outline: none; }
}

.main-area { flex: 1; min-height: 0; display: flex; gap: 12px; }
.table-wrap { flex: 1; min-width: 0; overflow: auto; border: 1px solid #e6eaf1; border-radius: 6px; }

table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
tr:hover td { background: #fafbfe; }
tr.checked td { background: #f0f7ff; }

.check-col { width: 34px; }
.col-name { min-width: 200px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-sm { white-space: nowrap; }
.col-point { min-width: 110px; }
.col-score { width: 90px; }

.score-input {
  width: 70px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 6px; font-size: 12px; outline: none;
}

.picked-panel {
  width: 220px; flex-shrink: 0; border: 1px solid #e6eaf1; border-radius: 6px;
  padding: 10px; display: flex; flex-direction: column;

  .panel-title { margin: 0 0 8px; font-size: 12px; color: #667; }
  .picked-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
  .picked-tag {
    display: flex; align-items: center; gap: 4px;
    background: #f0f5ff; border: 1px solid #d6e4ff; border-radius: 3px;
    padding: 3px 8px; font-size: 12px; color: #2f54eb;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;

    i { margin-left: auto; font-style: normal; cursor: pointer; color: #8a92a5; &:hover { color: #f5222d; } }
  }
  .empty-tip { font-size: 12px; color: #b0b7c3; }
}

.empty-cell { text-align: center; color: #b0b7c3; padding: 40px 0; }

.pagination {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: #667;
  button { width: 26px; height: 26px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; &:disabled { opacity: .5; } }
}

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; border-top: 1px solid #eee; }

.btn {
  padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
.btn-primary { border: none; border-radius: 4px; background: #1890ff; color: #fff; padding: 6px 16px; font-size: 12px; cursor: pointer; }
</style>