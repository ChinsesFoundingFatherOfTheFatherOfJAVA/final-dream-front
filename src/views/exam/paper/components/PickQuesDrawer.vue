<template>
  <!-- FP-13 从题库选题抽屉（截图20）：选题库 → 勾选试题 → 建关联（不复制题目） -->
    <el-drawer
    :model-value="true"
    size="980px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>从题库选题</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <el-select v-model="libId" class="filter-select" @change="reload(1)">
            <el-option value="" label="选择题库" />
            <el-option v-for="lib in libs" :key="lib.id" :value="lib.id" :label="lib.name" />
          </el-select>
          <el-select v-model="type" class="filter-select" @change="reload(1)">
            <el-option :value="-1" label="全部题型" />
            <el-option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)" :label="label" />
          </el-select>
          <el-select v-model="levelType" class="filter-select" @change="reload(1)">
            <el-option :value="-1" label="全部难度" />
            <el-option :value="0" label="易" />
            <el-option :value="1" label="中" />
            <el-option :value="2" label="难" />
          </el-select>
          <el-input v-model.trim="keyword" placeholder="请输入试题名称搜索" @keyup.enter="reload(1)" />
          <el-button class="btn-primary" @click="reload(1)">查询</el-button>
        </div>

        <div class="main-area">
          <div class="table-wrap">
            <el-table
              v-loading="loading"
              :data="records"
              row-key="id"
              empty-text="请先选择题库，或该题库下没有可选题"
            >
              <el-table-column width="44" align="center">
                <template #header>
                  <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll" />
                </template>
                <template #default="{ row }">
                  <el-checkbox :model-value="picked.has(row.id)" @change="toggle(row, Boolean($event))" />
                </template>
              </el-table-column>
              <el-table-column prop="summary" label="试题名称" min-width="260" show-overflow-tooltip />
              <el-table-column label="题型" width="100"><template #default="{ row }">{{ TYPE_LABELS[row.type] ?? '--' }}</template></el-table-column>
              <el-table-column label="难度" width="90"><template #default="{ row }">{{ LEVEL_LABELS[row.levelType] ?? '--' }}</template></el-table-column>
              <el-table-column label="考核点" width="140" show-overflow-tooltip><template #default="{ row }">{{ row.mainPointName || '--' }}</template></el-table-column>
              <el-table-column label="分值" width="110">
                <template #default="{ row }">
                  <el-input-number v-model="scores[row.id]" :min="0" :step="0.5" class="score-input" :controls="false" />
                </template>
              </el-table-column>
            </el-table>
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
          <el-pagination
            v-model:current-page="pageNo"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            background
            @current-change="reload"
          />
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!picked.size || saving" @click="confirm">
          {{ saving ? '添加中…' : `确定（${picked.size} 题）` }}
        </el-button>
      </div>
    </div>
    </el-drawer>
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
