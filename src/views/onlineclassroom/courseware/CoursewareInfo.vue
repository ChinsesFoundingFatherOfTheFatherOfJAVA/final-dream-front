<template>
  <div v-if="detail" class="detail-page">
    <header class="detail-header">
      <el-button class="back-btn" aria-label="返回课件管理" @click="router.push('/kng/courseware')">‹</el-button>
      <h1>课件详情</h1>
    </header>

    <nav class="detail-tabs">
      <el-button
        v-for="tab in tabs"
        :key="tab.key"
       
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </el-button>
      <el-button class="edit-btn" @click="router.push(`/kng/courseware/edit/${detail.id}`)">编辑</el-button>
    </nav>

    <main class="detail-content">
      <template v-if="activeTab === 'basic'">
        <div class="basic-layout">
          <div class="basic-main">
            <section ref="mainInfoSection" class="info-section" data-anchor="main">
              <h2><i aria-hidden="true"></i>主要信息</h2>
              <dl>
                <template v-for="row in mainRows" :key="row.label">
                  <dt>{{ row.label }}</dt>
                  <dd :class="{ 'score-follow': row.follow }">{{ row.value }}</dd>
                </template>
              </dl>
            </section>

            <section ref="relatedInfoSection" class="info-section" data-anchor="related">
              <h2><i aria-hidden="true"></i>相关方信息</h2>
              <dl>
                <dt>贡献者</dt>
                <dd>{{ contributorText }}</dd>
              </dl>
            </section>

            <section ref="permissionInfoSection" class="info-section" data-anchor="permission">
              <h2><i aria-hidden="true"></i>权限设置</h2>
              <dl>
                <dt>浏览权限</dt>
                <dd>{{ detail.viewPermission === 2 ? '单独设置允许浏览' : '跟随分类浏览权限' }}</dd>
                <dt>下载权限</dt>
                <dd>{{ detail.downloadEnabled ? (detail.downloadPermission === 2 ? '允许下载（单独设置）' : '允许下载（跟随分类）') : '不允许下载' }}</dd>
                <dt>App保存课件权限</dt>
                <dd>{{ detail.appSaveEnabled ? (detail.appSavePermission === 2 ? '允许保存（单独设置）' : '允许保存（跟随分类）') : '不允许保存' }}</dd>
              </dl>
            </section>

            <section ref="functionInfoSection" class="info-section" data-anchor="function">
              <h2><i aria-hidden="true"></i>功能设置</h2>
              <dl>
                <dt>倍速播放</dt>
                <dd>{{ effectiveSpeed ? '开启' : '关闭' }}</dd>
                <dt>学时计算</dt>
                <dd>{{ effectiveHours ? '倍速播放时学习时长也倍速计算' : '关闭' }}</dd>
                <dt>AI字幕</dt>
                <!-- AI字幕与转码专项已上线：去掉"生成能力待专项上线"占位后缀，开关值语义不变 -->
                <dd>{{ detail.aiSubtitleEnabled ? '开启AI字幕' : '关闭' }}</dd>
              </dl>
            </section>
          </div>

          <aside class="basic-aside">
            <div class="cover-box">
              <img v-if="detail.coverUrl" :src="resolveAssetUrl(detail.coverUrl)" :alt="`${detail.title}封面`" loading="lazy" />
              <div v-else class="cover-placeholder">暂无封面</div>
            </div>
            <nav class="anchor-nav">
              <el-button
                v-for="item in anchorItems"
                :key="item.key"
               
                :class="{ active: activeAnchor === item.key }"
                @click="scrollBasic(item.key)"
              >
                {{ item.label }}
              </el-button>
            </nav>
          </aside>
        </div>
      </template>

      <template v-else-if="activeTab === 'study'">
        <section class="study-filter">
          <el-button class="filter-button" @click="deptPickerVisible = true">
            {{ deptName || '所属部门' }}
            <span aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
          </el-button>
          <el-select v-model="studyQuery.studyStatus" placeholder="学习状态" @change="loadStudyRecords(1)">
            <el-option label="学习状态" :value="null" />
            <el-option label="已完课" :value="1" />
            <el-option label="学习中" :value="2" />
          </el-select>
          <el-select v-model="studyQuery.finishMethod" placeholder="完课方式" @change="loadStudyRecords(1)">
            <el-option label="完课方式" :value="null" />
            <el-option label="培训" :value="1" />
            <el-option label="自学" :value="2" />
          </el-select>
          <el-input
            v-model.trim="studyQuery.keyword"
            class="study-search"
            placeholder="请输入姓名/账号搜索"
            clearable
            @keyup.enter="loadStudyRecords(1)"
          >
            <template #prefix><span aria-hidden="true"><el-icon><Search /></el-icon></span></template>
          </el-input>
        </section>

        <div class="study-table-wrap">
          <el-table :data="studyRecords.records" row-key="userId" class="study-table" empty-text="暂无数据">
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
                  <i aria-hidden="true"></i>{{ row.studyStatusDesc }}
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
          </el-table>
        </div>

        <PaginationBar
          v-model:page="studyPage"
          v-model:page-size="studyPageSize"
          :total="studyRecords.total"
          @change="loadStudyRecords()"
        />
      </template>

      <template v-else>
        <section class="data-heading">
          <h2><i aria-hidden="true"></i>学习数据概览</h2>
          <span>（数据统计自课件发布之日起至今）</span>
        </section>
        <div class="stat-grid">
          <article>
            <span>近7天学习人数（人） <i aria-hidden="true">i</i></span>
            <strong>{{ overview.numOf7days }}</strong>
          </article>
          <article>
            <span>总学习人数（人） <i aria-hidden="true">i</i></span>
            <strong>{{ overview.numOftotal }}</strong>
          </article>
          <article>
            <span>总完课人数（人） <i aria-hidden="true">i</i></span>
            <strong>{{ overview.numOfFinish }}</strong>
          </article>
        </div>

        <section class="data-heading second">
          <h2><i aria-hidden="true"></i>学习数据分析</h2>
          <span>（数据统计自课件发布之日起至今）</span>
        </section>

        <div class="chart-grid">
          <article class="chart-card">
            <h3>学员完课用时概览 <i aria-hidden="true">i</i></h3>
            <div class="horizontal-chart">
              <div v-for="item in finishBars" :key="item.label">
                <span>{{ item.label }}</span>
                <div class="bar-track">
                  <i aria-hidden="true" :style="{ width: `${item.percent}%` }"></i>
                </div>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </article>

          <article class="chart-card">
            <header>
              <h3>各部门学习完课数据概览</h3>
              <el-select v-model="selectedDeptId" placeholder="全部一级部门" @change="loadDeptFinish">
                <el-option label="全部一级部门" value="" />
                <el-option v-for="dept in firstLevelDepts" :key="dept.id" :label="dept.name" :value="dept.id" />
              </el-select>
            </header>
            <div class="legend">
              <span><i class="study" aria-hidden="true"></i>学习人数</span>
              <span><i class="finish" aria-hidden="true"></i>完课人数</span>
            </div>
            <div class="dept-chart" :style="{ gridTemplateColumns: `repeat(${Math.max(1, deptData.length)}, minmax(110px, 1fr))` }">
              <div v-for="item in deptData" :key="item.deptId" class="dept-column">
                <div class="bars">
                  <i class="study" aria-hidden="true" :style="{ height: `${barHeight(item.numOfStudyPeo)}%` }"></i>
                  <i class="finish" aria-hidden="true" :style="{ height: `${barHeight(item.numOfFinishPeo)}%` }"></i>
                </div>
                <span>{{ item.deptName }}</span>
              </div>
              <div v-if="!deptData.length" class="chart-empty">暂无数据</div>
            </div>
          </article>
        </div>
      </template>
    </main>

    <DeptPickerDialog
      :visible="deptPickerVisible"
      :dept-id="studyQuery.deptId || ''"
      :has-child="studyQuery.hasChild || 1"
      @close="deptPickerVisible = false"
      @confirm="applyDept"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Search } from '@element-plus/icons-vue'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PaginationBar from './components/PaginationBar.vue'
import DeptPickerDialog from './components/DeptPickerDialog.vue'
import {
  getCoursewareDeptFirstLevel,
  getCoursewareDetail,
  getDeptFinishOverview,
  getFinishTimeOverview,
  getStudyOverview,
  getStudyRecords,
  type CoursewareDetail,
  type StudyOverview
} from '@/api/courseware'
import { getKngSetting, type KngSetting } from '@/api/kng'
import { resolveAssetUrl } from '@/api/request'

const route = useRoute()
const router = useRouter()
const detail = ref<CoursewareDetail | null>(null)
const settings = ref<KngSetting | null>(null)
const activeTab = ref<'basic' | 'study' | 'data'>('basic')
const activeAnchor = ref('main')
const mainInfoSection = ref<HTMLElement | null>(null)
const relatedInfoSection = ref<HTMLElement | null>(null)
const permissionInfoSection = ref<HTMLElement | null>(null)
const functionInfoSection = ref<HTMLElement | null>(null)
const studyPage = ref(1)
const studyPageSize = ref(10)
const studyRecords = reactive<{ total: number; records: Awaited<ReturnType<typeof getStudyRecords>>['records'] }>({
  total: 0,
  records: []
})
const studyQuery = reactive<{
  deptId: string | null
  hasChild: number
  studyStatus: number | null
  finishMethod: number | null
  keyword: string
}>({ deptId: null, hasChild: 1, studyStatus: null, finishMethod: null, keyword: '' })
const deptName = ref('')
const deptPickerVisible = ref(false)
const overview = reactive<StudyOverview>({ numOf7days: 0, numOftotal: 0, numOfFinish: 0 })
const finishTime = reactive({
  numInOneDay: 0,
  numInOneWeek: 0,
  numInOneMon: 0,
  numInThreeMon: 0,
  numInMoreThrMon: 0
})
const firstLevelDepts = ref<Array<{ id: string; name: string }>>([])
const selectedDeptId = ref('')
const deptData = ref<Array<{
  deptId: string
  deptName: string
  numOfStudyPeo: number
  numOfFinishPeo: number
}>>([])

const tabs = [
  { key: 'basic' as const, label: '基础信息' },
  { key: 'study' as const, label: '学习详情' },
  { key: 'data' as const, label: '学习数据' }
]
const anchorItems = [
  { key: 'main', label: '主要信息' },
  { key: 'related', label: '相关方信息' },
  { key: 'permission', label: '权限设置' },
  { key: 'function', label: '功能设置' }
]
const contributorText = computed(() => {
  const item = detail.value?.contributor
  return item ? `${item.name}(${item.account})` : '--'
})
const effectiveSpeed = computed(() => {
  const play = settings.value?.playConf
  if (!play?.speedEnabled) return false
  if (play.speedScope === 1) return true
  return Boolean(detail.value?.speedEnabled)
})
const effectiveHours = computed(() => Boolean(effectiveSpeed.value && detail.value?.speedHoursCalc && settings.value?.playConf.speedHoursCalc))
const mainRows = computed(() => {
  const item = detail.value
  if (!item) return []
  return [
    { label: '名称', value: item.title },
    { label: '分类', value: item.catalogPath || '--' },
    { label: '标准时长', value: `${item.standardMinutes} 分 ${item.standardSeconds} 秒（获得学分所需的学习时长）` },
    {
      label: item.studyScore === null ? '学分（跟随学时学分策略）' : '学分',
      value: `${Number(item.studyScoreCalc || 0).toFixed(2)} 学分`,
      follow: item.studyScore === null
    },
    { label: '平台课程编号', value: item.platformNo || '--' },
    { label: '完课标准', value: `完成标准时长的 ${item.finishStandardPercent}% 获得学分` },
    { label: '简介', value: item.description || '--' },
    { label: '附件', value: item.attachments.length ? item.attachments.map(file => file.fileName).join('、') : '--' },
    { label: '编码', value: item.code || '--' },
    { label: '版本', value: item.versionStr || '--' }
  ]
})
const finishMax = computed(() => Math.max(1, ...Object.values(finishTime)))
const finishBars = computed(() => [
  { label: '1天内', value: finishTime.numInOneDay, percent: Math.round(finishTime.numInOneDay / finishMax.value * 100) },
  { label: '2-7天', value: finishTime.numInOneWeek, percent: Math.round(finishTime.numInOneWeek / finishMax.value * 100) },
  { label: '8-30天', value: finishTime.numInOneMon, percent: Math.round(finishTime.numInOneMon / finishMax.value * 100) },
  { label: '31-90天', value: finishTime.numInThreeMon, percent: Math.round(finishTime.numInThreeMon / finishMax.value * 100) },
  { label: '90天以上', value: finishTime.numInMoreThrMon, percent: Math.round(finishTime.numInMoreThrMon / finishMax.value * 100) }
])
const deptMax = computed(() => Math.max(1, ...deptData.value.flatMap(item => [item.numOfStudyPeo, item.numOfFinishPeo])))

function barHeight(value: number) {
  return Math.round(value / deptMax.value * 100)
}

function scrollBasic(key: string) {
  activeAnchor.value = key
  const targets: Record<string, HTMLElement | null> = {
    main: mainInfoSection.value,
    related: relatedInfoSection.value,
    permission: permissionInfoSection.value,
    function: functionInfoSection.value
  }
  targets[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadStudyRecords(nextPage?: number) {
  if (nextPage) studyPage.value = nextPage
  if (!detail.value) return
  const result = await getStudyRecords(
    detail.value.id,
    { page: studyPage.value, pageSize: studyPageSize.value },
    studyQuery
  )
  studyRecords.total = result.total
  studyRecords.records = result.records
}

function applyDept(value: { deptId: string; hasChild: number }) {
  studyQuery.deptId = value.deptId || null
  studyQuery.hasChild = value.hasChild
  deptName.value = value.deptId ? '已选择部门' : ''
  deptPickerVisible.value = false
  void loadStudyRecords(1)
}

async function loadData() {
  if (!detail.value) return
  const [overviewResult, finishResult, deptResult, firstLevel] = await Promise.all([
    getStudyOverview(detail.value.id),
    getFinishTimeOverview(detail.value.id),
    getDeptFinishOverview(detail.value.id, selectedDeptId.value ? [selectedDeptId.value] : []),
    getCoursewareDeptFirstLevel()
  ])
  Object.assign(overview, overviewResult)
  Object.assign(finishTime, finishResult)
  deptData.value = deptResult
  firstLevelDepts.value = firstLevel
}

async function loadDeptFinish() {
  if (!detail.value) return
  deptData.value = await getDeptFinishOverview(
    detail.value.id,
    selectedDeptId.value ? [selectedDeptId.value] : []
  )
}

onMounted(async () => {
  detail.value = await getCoursewareDetail(String(route.params.id))
  settings.value = await getKngSetting()
  await nextTick()
})
</script>

<style scoped lang="scss">
.detail-page {
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

.detail-tabs {
  position: relative;
  height: 62px;
  display: flex;
  align-items: center;
  gap: 42px;
  padding: 0 24px;
  border-bottom: 1px solid #e8ecf2;

  button {
    position: relative;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: #4d5568;
    font-size: 14px;
    cursor: pointer;

    &.active {
      color: #2e7cf6;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
        background: #2e7cf6;
      }
    }

    &.edit-btn {
      height: 32px;
      margin-left: auto;
      padding: 0 18px;
      border-radius: 5px;
      background: #2e7cf6;
      color: #fff;
    }
  }
}

.detail-content {
  padding: 22px 26px 40px;
}

.basic-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 46px;
}

.basic-main {
  max-width: 850px;
}

.info-section {
  scroll-margin-top: 20px;
  margin-bottom: 18px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 20px;
    color: #30384a;
    font-size: 16px;

    i {
      width: 3px;
      height: 18px;
      background: #2e7cf6;
    }
  }

  dl {
    display: grid;
    grid-template-columns: 180px 1fr;
    margin: 0;
  }

  dt,
  dd {
    min-height: 42px;
    margin: 0;
    padding: 8px 0;
    font-size: 14px;
    line-height: 1.6;
  }

  dt {
    color: #8b95a7;
  }

  dd {
    color: #30384a;
    word-break: break-word;
  }
}

.score-follow {
  color: #2e7cf6 !important;
}

.basic-aside {
  display: flex;
  align-items: flex-start;
  gap: 28px;
}

.cover-box {
  width: 300px;
  height: 170px;
  overflow: hidden;
  background: #111827;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cover-placeholder {
  height: 100%;
  display: grid;
  place-items: center;
  color: #98a1b2;
  font-size: 13px;
}

.anchor-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;

  button {
    padding: 0;
    border: none;
    background: transparent;
    color: #7b8496;
    text-align: left;
    font-size: 14px;
    cursor: pointer;

    &.active {
      color: #2e7cf6;
    }
  }
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

.empty-cell {
  height: 220px;
  color: #98a1b2;
  text-align: center;
}

.data-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: #30384a;
    font-size: 16px;

    i {
      width: 3px;
      height: 18px;
      background: #2e7cf6;
    }
  }

  span {
    color: #98a1b2;
    font-size: 12px;
  }

  &.second {
    margin-top: 26px;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;

  article {
    padding: 22px 24px;
    border: 1px solid #e6eaf1;
    border-radius: 3px;
    background: #fff;

    span {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #667085;
      font-size: 13px;

      i,
      h3 i {
        width: 14px;
        height: 14px;
        display: grid;
        place-items: center;
        border: 1px solid #98a1b2;
        border-radius: 50%;
        font-size: 9px;
        font-style: normal;
      }
    }

    strong {
      display: block;
      margin-top: 16px;
      color: #30384a;
      font-size: 30px;
      font-weight: 500;
    }
  }
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px;
}

.chart-card {
  min-height: 360px;
  padding: 22px;
  border: 1px solid #e6eaf1;
  border-radius: 3px;
  background: #fff;

  h3 {
    margin: 0;
    color: #30384a;
    font-size: 15px;
  }

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    :deep(.el-select) {
      width: 180px;
    }

    :deep(.el-select__wrapper) {
      min-height: 34px;
      border-radius: 5px;
    }
  }
}

.horizontal-chart {
  display: flex;
  flex-direction: column;
  gap: 19px;
  margin-top: 36px;

  > div {
    display: grid;
    grid-template-columns: 72px 1fr 34px;
    align-items: center;
    gap: 10px;
    color: #667085;
    font-size: 12px;
  }

  .bar-track {
    height: 12px;
    overflow: hidden;
    border-radius: 2px;
    background: #eef2f7;

    i {
      display: block;
      height: 100%;
      background: #4c8cff;
    }
  }

  strong {
    color: #4d5568;
    font-weight: 500;
  }
}

.legend {
  display: flex;
  justify-content: flex-end;
  gap: 22px;
  margin-top: 22px;
  color: #667085;
  font-size: 12px;

  span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  i {
    width: 10px;
    height: 10px;
  }

  .study {
    background: #4c8cff;
  }

  .finish {
    background: #45c99a;
  }
}

.dept-chart {
  position: relative;
  height: 230px;
  display: grid;
  align-items: end;
  gap: 12px;
  margin-top: 18px;
  padding: 16px 10px 35px;
  border-bottom: 1px solid #dfe4eb;
  background: repeating-linear-gradient(to top, transparent 0, transparent 54px, #edf0f5 55px);
}

.dept-column {
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-direction: column;

  .bars {
    height: 100%;
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  .bars i {
    width: 28px;
    min-height: 2px;
  }

  .study {
    background: #4c8cff;
  }

  .finish {
    background: #45c99a;
  }

  span {
    width: 100%;
    margin-top: 8px;
    overflow: hidden;
    color: #667085;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #98a1b2;
  font-size: 13px;
}
</style>
