<template>
  <div class="study-page">
    <header class="detail-header">
      <button type="button" class="back-btn" @click="goBack">‹</button>
      <h1>[课件] {{ coursewareTitle || '...' }}</h1>
    </header>

    <main class="study-body">
      <!-- CS-05 筛选：所属部门弹窗（deptId/hasChild）+ 学习状态 + 完课方式 + 姓名/账号搜索 -->
      <section class="study-filter">
        <button type="button" class="filter-button" @click="deptPickerVisible = true">
          {{ deptName || '所属部门' }}
          <span>⌄</span>
        </button>
        <select v-model="query.studyStatus" @change="reload(1)">
          <option :value="null">学习状态</option>
          <option :value="1">已完课</option>
          <option :value="2">学习中</option>
        </select>
        <select v-model="query.finishMethod" @change="reload(1)">
          <option :value="null">完课方式</option>
          <option :value="1">培训</option>
          <option :value="2">自学</option>
        </select>
        <label class="study-search">
          <span>⌕</span>
          <input v-model.trim="query.keyword" placeholder="请输入姓名/账号搜索" @keyup.enter="reload(1)" />
        </label>
      </section>

      <div class="study-table-wrap">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>账号</th>
              <th>所属部门</th>
              <th>岗位</th>
              <th>学习状态</th>
              <th>开始学习时间</th>
              <th>完成时间</th>
              <th>累计学习时长</th>
              <th>完课用时</th>
              <th>完课方式</th>
              <!-- 比课件管理的学习详情多出的最后一列 -->
              <th>学习进度(%)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in records.records" :key="row.userId">
              <td>{{ row.name }}</td>
              <td>{{ row.account }}</td>
              <td>{{ row.deptName || '--' }}</td>
              <td>{{ row.post || '--' }}</td>
              <td>
                <span class="study-status" :class="`study-${row.studyStatus}`">
                  <i></i>{{ row.studyStatusDesc }}
                </span>
              </td>
              <td>{{ row.startStudyTime || '--' }}</td>
              <td>{{ row.endStudyTime || '--' }}</td>
              <td>{{ Number(row.studyLenHours || 0).toFixed(2) }} h</td>
              <td>{{ row.finishCostDays == null ? '--' : `${row.finishCostDays} 天` }}</td>
              <td>{{ row.finishMethodDesc || '--' }}</td>
              <td>{{ row.studySchedule == null ? '-' : `${row.studySchedule}%` }}</td>
            </tr>
            <tr v-if="!records.records.length">
              <td colspan="11" class="empty-cell">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        v-model:page="pageNo"
        v-model:page-size="pageSize"
        :total="records.total"
        @change="reload()"
      />
    </main>

    <DeptPickerDialog
      :visible="deptPickerVisible"
      :dept-id="query.deptId || ''"
      :has-child="query.hasChild || 1"
      @close="deptPickerVisible = false"
      @confirm="applyDept"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DeptPickerDialog from '../courseware/components/DeptPickerDialog.vue'
import PaginationBar from '../courseware/components/PaginationBar.vue'
import { getCourseCoursewareStudyRecords, type CourseStudyRecord } from '@/api/course'
import { getCoursewareDetail } from '@/api/courseware'

const route = useRoute()
const router = useRouter()
const courseId = String(route.params.courseId)
const coursewareId = String(route.params.coursewareId)
const coursewareTitle = ref('')
const pageNo = ref(1)
const pageSize = ref(10)
const records = reactive<{ total: number; records: CourseStudyRecord[] }>({ total: 0, records: [] })
const deptPickerVisible = ref(false)
const deptName = ref('')
const query = reactive<{
  deptId: string | null
  hasChild: number
  studyStatus: number | null
  finishMethod: number | null
  keyword: string
}>({ deptId: null, hasChild: 1, studyStatus: null, finishMethod: null, keyword: '' })

async function reload(nextPage?: number) {
  if (nextPage) pageNo.value = nextPage
  const result = await getCourseCoursewareStudyRecords(
    courseId,
    coursewareId,
    { page: pageNo.value, pageSize: pageSize.value },
    {
      deptId: query.deptId,
      hasChild: query.hasChild,
      studyStatus: query.studyStatus,
      finishMethod: query.finishMethod,
      keyword: query.keyword || undefined
    }
  )
  records.total = result.total
  records.records = result.records
}

function applyDept(value: { deptId: string; hasChild: number }) {
  query.deptId = value.deptId || null
  query.hasChild = value.hasChild
  deptName.value = value.deptId ? '已选择部门' : ''
  deptPickerVisible.value = false
  void reload(1)
}

function goBack() {
  router.push(`/kng/course/info/${courseId}`)
}

onMounted(async () => {
  // 页标题需要课件名：复用课件详情接口（仅取名称展示）
  const detail = await getCoursewareDetail(coursewareId)
  coursewareTitle.value = detail.title
  await reload()
})
</script>

<style scoped lang="scss">
.study-page {
  min-height: calc(100vh - 104px);
  background: #fff;
}

.detail-header {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid #e8ecf2;

  h1 {
    margin: 0;
    color: #30384a;
    font-size: 18px;
  }
}

.back-btn {
  border: none;
  background: transparent;
  color: #4d5568;
  font-size: 30px;
  cursor: pointer;
}

.study-body {
  padding: 22px 26px 40px;
}

.study-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  select,
  .filter-button,
  .study-search {
    height: 38px;
    border: 1px solid #d9deea;
    border-radius: 5px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
  }

  select {
    width: 160px;
    padding: 0 10px;
  }

  .filter-button {
    min-width: 150px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    cursor: pointer;
  }

  .study-search {
    width: 240px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 10px;
    color: #98a1b2;

    input {
      min-width: 0;
      flex: 1;
      border: none;
      outline: none;
    }
  }
}

.study-table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1240px;
  border-collapse: collapse;

  th,
  td {
    height: 46px;
    padding: 0 12px;
    border-bottom: 1px solid #edf0f5;
    color: #4d5568;
    text-align: left;
    font-size: 13px;
    white-space: nowrap;
  }

  th {
    background: #f8fafc;
    color: #30384a;
    font-weight: 600;
  }
}

.study-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2e7cf6;
  }

  &.study-1 i {
    background: #35b56a;
  }
}

.empty-cell {
  height: 220px;
  color: #98a1b2;
  text-align: center;
}
</style>
