<template>
  <div v-if="detail" class="detail-page">
    <header class="detail-header">
      <el-button class="back-btn" aria-label="返回课程列表" @click="router.push('/kng/course')">‹</el-button>
      <h1>课程详情</h1>
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
      <el-button class="edit-btn" @click="router.push(`/kng/course/edit/${detail.id}/step1`)">编辑</el-button>
    </nav>

    <main class="detail-content">
      <!-- CS-03 基础信息：label-value + 右侧封面 + 锚点只读四区 -->
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
              </dl>
            </section>

            <section ref="functionInfoSection" class="info-section" data-anchor="function">
              <h2><i aria-hidden="true"></i>功能设置</h2>
              <dl>
                <dt>倍速播放</dt>
                <dd>{{ effectiveSpeed ? '开启' : '关闭' }}</dd>
                <dt>学时计算</dt>
                <dd>{{ effectiveHours ? '倍速播放时学习时长也倍速计算' : '关闭' }}</dd>
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

      <!-- CS-04 学习详情：章节分组表（无章节=平铺） -->
      <template v-else-if="activeTab === 'study'">
        <p class="study-note">
          仅统计当前课程下各个课件的学习数据，若课件在其他地方被学习，产生的学习数据不在此课程中统计
        </p>

        <div class="study-table-wrap">
          <el-table
            :data="studyRows"
            row-key="key"
            class="study-table"
            empty-text="暂无数据"
            :span-method="studySpanMethod"
            :row-class-name="studyRowClass"
          >
            <el-table-column label="课件名" min-width="360">
              <template #default="{ row }">
                <el-button
                  v-if="row.kind === 'chapter'"
                  class="chapter-toggle"
                  @click="toggleChapter(row.chapterId)"
                >
                  <span class="arrow" aria-hidden="true"><el-icon class="fold" v-if="expandedChapters.has(row.chapterId)"><CaretBottom /></el-icon><el-icon class="fold" v-else><CaretRight /></el-icon></span>
                  {{ row.chapterName }}
                </el-button>
                <template v-else>
                  <span class="type-icon" :class="`type-${row.task.coursewareType}`" aria-hidden="true">{{ typeBadge(row.task.coursewareType) }}</span>
                  {{ row.task.taskName }}
                </template>
              </template>
            </el-table-column>
            <el-table-column label="近7天学习人数" width="150">
              <template #header>近7天学习人数 <i class="info-dot" aria-hidden="true" title="近7天学习该课件的人数">i</i></template>
              <template #default="{ row }">{{ row.kind === 'task' ? row.task.numOfPastweek : '' }}</template>
            </el-table-column>
            <el-table-column label="总学习人数" width="140">
              <template #header>总学习人数 <i class="info-dot" aria-hidden="true" title="累计学习该课件的人数">i</i></template>
              <template #default="{ row }">{{ row.kind === 'task' ? row.task.numOfTotal : '' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button
                  v-if="row.kind === 'task'"
                  link
                  type="primary"
                  @click="router.push(`/kng/course/courseware-study/${detail.id}/${row.task.coursewareId}`)"
                >
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>

      <!-- CS-06 学习数据：组件级复用课件详情实现，接口前缀换 course -->
      <template v-else>
        <section class="data-heading">
          <h2><i aria-hidden="true"></i>学习数据概览</h2>
          <span>（数据统计自课程发布之日起至今）</span>
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
          <span>（数据统计自课程发布之日起至今）</span>
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
  </div>
</template>

<script setup lang="ts">
import { CaretBottom, CaretRight } from '@element-plus/icons-vue'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getChapterStudyStats,
  getCourseDeptFinishOverview,
  getCourseDeptFirstLevel,
  getCourseDetail,
  getCourseFinishTimeOverview,
  getCourseStudyOverview,
  type ChapterStudyStat,
  type ChapterStudyTask,
  type CourseDetail
} from '@/api/course'
import { getKngSetting, type KngSetting } from '@/api/kng'
import { resolveAssetUrl } from '@/api/request'

const route = useRoute()
const router = useRouter()
const detail = ref<CourseDetail | null>(null)
const settings = ref<KngSetting | null>(null)
const activeTab = ref<'basic' | 'study' | 'data'>('basic')
const activeAnchor = ref('main')
const mainInfoSection = ref<HTMLElement | null>(null)
const relatedInfoSection = ref<HTMLElement | null>(null)
const permissionInfoSection = ref<HTMLElement | null>(null)
const functionInfoSection = ref<HTMLElement | null>(null)
const chapters = ref<ChapterStudyStat[]>([])
const expandedChapters = ref(new Set<string>())
type StudyRow =
  | { kind: 'chapter'; key: string; chapterId: string; chapterName: string }
  | { kind: 'task'; key: string; task: ChapterStudyTask }
const studyRows = computed<StudyRow[]>(() => {
  const rows: StudyRow[] = []
  for (const chapter of chapters.value) {
    const chapterId = chapter.chapterId
    if (chapterId) {
      rows.push({
        kind: 'chapter',
        key: `chapter-${chapterId}`,
        chapterId,
        chapterName: chapter.chapterName || ''
      })
      if (!expandedChapters.value.has(chapterId)) continue
    }
    for (const task of chapter.tasks) {
      rows.push({
        kind: 'task',
        key: `${chapterId || 'flat'}-${task.coursewareId}`,
        task
      })
    }
  }
  return rows
})
const overview = reactive({ numOf7days: 0, numOftotal: 0, numOfFinish: 0 })
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
/** 标准时长展示：优先取后端聚合的任务时长和（standardDurationCalc 秒），无任务回退手填值（CS-03 验收："13 分 20 秒"） */
const standardDurationText = computed(() => {
  const item = detail.value
  if (!item) return '--'
  if (item.standardDurationCalc > 0) {
    const minutes = Math.floor(item.standardDurationCalc / 60)
    const seconds = item.standardDurationCalc % 60
    return `${minutes} 分 ${seconds} 秒`
  }
  return `${item.standardMinutes} 分 ${item.standardSeconds} 秒`
})
const mainRows = computed(() => {
  const item = detail.value
  if (!item) return []
  return [
    { label: '名称', value: item.title },
    { label: '分类', value: item.catalogPath || '--' },
    { label: '标准时长', value: standardDurationText.value },
    {
      // 课程学分"跟随"语义=任务学分和（studyScoreCalc），非策略折算（附录B 决策）
      label: item.studyScore === null ? '学分（跟随学分策略）' : '学分',
      value: `${Number(item.studyScoreCalc || 0).toFixed(2)} 学分`,
      follow: item.studyScore === null
    },
    { label: '平台课程编号', value: item.platformNo || '--' },
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

function typeBadge(type: number) {
  return type === 2 ? '▶' : type === 3 ? '♫' : type === 4 ? '▣' : type === 6 ? 'SC' : type === 7 ? '<>' : type === 8 ? '↗' : 'P'
}

const studySpanMethod = ({ row, columnIndex }: { row: StudyRow; columnIndex: number }) => {
  if (row.kind !== 'chapter') return undefined
  return columnIndex === 0 ? { rowspan: 1, colspan: 4 } : { rowspan: 0, colspan: 0 }
}

const studyRowClass = ({ row }: { row: StudyRow }) => row.kind === 'chapter' ? 'chapter-row' : ''

function toggleChapter(chapterId: string) {
  const next = new Set(expandedChapters.value)
  if (next.has(chapterId)) next.delete(chapterId)
  else next.add(chapterId)
  expandedChapters.value = next
}

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

async function loadStudyTab() {
  const id = detail.value?.id
  if (!id) return
  const result = await getChapterStudyStats(id)
  chapters.value = result
  // 章节默认展开；无章节课程 tasks 平铺显示，不受展开态影响
  expandedChapters.value = new Set(
    result.filter(item => item.chapterId).map(item => item.chapterId as string)
  )
}

async function loadData() {
  const id = detail.value?.id
  if (!id) return
  const [overviewResult, finishResult, deptResult, firstLevel] = await Promise.all([
    getCourseStudyOverview(id),
    getCourseFinishTimeOverview(id),
    getCourseDeptFinishOverview(id, selectedDeptId.value ? [selectedDeptId.value] : []),
    getCourseDeptFirstLevel()
  ])
  Object.assign(overview, overviewResult)
  Object.assign(finishTime, finishResult)
  deptData.value = deptResult
  firstLevelDepts.value = firstLevel
}

async function loadDeptFinish() {
  const id = detail.value?.id
  if (!id) return
  deptData.value = await getCourseDeptFinishOverview(
    id,
    selectedDeptId.value ? [selectedDeptId.value] : []
  )
}

onMounted(async () => {
  const id = String(route.params.id)
  detail.value = await getCourseDetail(id)
  // tab 切换为纯前端渲染，学习详情/学习数据在首屏一并加载（数据量小，保持实现简单）
  await Promise.all([loadStudyTab(), loadData()])
  settings.value = await getKngSetting().catch(() => null)
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

.study-note {
  margin: 0 0 16px;
  color: #98a1b2;
  font-size: 13px;
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

.info-dot {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  border: 1px solid #98a1b2;
  border-radius: 50%;
  color: #98a1b2;
  font-size: 9px;
  font-style: normal;
  cursor: help;
}

.study-table :deep(.chapter-row) {
  background: #f8fafc;

  td {
    font-weight: 600;
    color: #30384a;
  }
}

.chapter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: #30384a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.arrow {
  color: #7b8496;
}

.type-icon {
  width: 25px;
  height: 25px;
  display: inline-grid;
  place-items: center;
  margin-right: 8px;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  vertical-align: middle;
}

.type-1 {
  background: #f45b69;
}

.type-2 {
  background: #6b7cff;
}

.type-3 {
  background: #27b788;
}

.type-4,
.type-6,
.type-7 {
  background: #8b95a7;
}

.type-8 {
  background: #2e7cf6;
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: #2e7cf6;
  font-size: 13px;
  cursor: pointer;
}

.empty-cell {
  height: 160px;
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

      i {
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

.fold { vertical-align: -2px; margin-left: 2px; }
</style>
