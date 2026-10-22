<template>
  <div class="study-page">
    <header class="detail-header">
      <el-button class="back-btn" @click="goBack">‹</el-button>
      <h1>[课件] {{ coursewareTitle || '...' }}</h1>
    </header>

    <main class="study-body">
      <!-- CS-05 筛选：所属部门弹窗（deptId/hasChild）+ 学习状态 + 完课方式 + 姓名/账号搜索 -->
      <section class="study-filter">
        <el-button class="filter-button" @click="deptPickerVisible = true">
          {{ deptName || '所属部门' }}
          <span>⌄</span>
        </el-button>
        <el-select v-model="query.studyStatus" placeholder="学习状态" @change="reload(1)">
          <el-option label="学习状态" :value="null" />
          <el-option label="已完课" :value="1" />
          <el-option label="学习中" :value="2" />
        </el-select>
        <el-select v-model="query.finishMethod" placeholder="完课方式" @change="reload(1)">
          <el-option label="完课方式" :value="null" />
          <el-option label="培训" :value="1" />
          <el-option label="自学" :value="2" />
        </el-select>
        <el-input
          v-model.trim="query.keyword"
          class="study-search"
          placeholder="请输入姓名/账号搜索"
          clearable
          @keyup.enter="reload(1)"
        >
          <template #prefix>⌕</template>
        </el-input>
      </section>

      <div class="study-table-wrap">
        <el-table :data="records.records" row-key="userId" class="study-table" empty-text="暂无数据">
          <el-table-column prop="name" label="姓名" width="110" />
          <el-table-column prop="account" label="账号" width="130" />
          <el-table-column label="所属部门" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.deptName || '--' }}</template>
          </el-table-column>
          <el-table-column label="岗位" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.post || '--' }}</template>
          </el-table-column>
          <el-table-column label="学习状态" width="110">
            <template #default="{ row }">
              <span class="study-status" :class="`study-${row.studyStatus}`">
                <i></i>{{ row.studyStatusDesc }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="开始学习时间" width="170">
            <template #default="{ row }">{{ row.startStudyTime || '--' }}</template>
          </el-table-column>
          <el-table-column label="完成时间" width="170">
            <template #default="{ row }">{{ row.endStudyTime || '--' }}</template>
          </el-table-column>
          <el-table-column label="累计学习时长" width="130">
            <template #default="{ row }">{{ Number(row.studyLenHours || 0).toFixed(2) }} h</template>
          </el-table-column>
          <el-table-column label="完课用时" width="110">
            <template #default="{ row }">{{ row.finishCostDays == null ? '--' : `${row.finishCostDays} 天` }}</template>
          </el-table-column>
          <el-table-column label="完课方式" width="110">
            <template #default="{ row }">{{ row.finishMethodDesc || '--' }}</template>
          </el-table-column>
          <el-table-column label="学习进度(%)" width="120">
            <template #default="{ row }">{{ row.studySchedule == null ? '-' : `${row.studySchedule}%` }}</template>
          </el-table-column>
        </el-table>
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

  :deep(.el-select),
  .filter-button,
  .study-search {
    height: 38px;
    border-radius: 5px;
    color: #4d5568;
    font-size: 13px;
  }

  :deep(.el-select) {
    width: 160px;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    min-height: 38px;
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
  }
}

.study-table-wrap {
  overflow-x: auto;
}

.study-table {
  width: 100%;

  :deep(.el-table__header th) {
    height: 46px;
    background: #f8fafc;
    color: #30384a;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row td) {
    height: 46px;
    color: #4d5568;
    font-size: 13px;
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

</style>
