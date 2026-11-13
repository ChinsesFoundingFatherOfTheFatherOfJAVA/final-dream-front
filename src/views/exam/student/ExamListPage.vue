<template>
  <div class="exam-list-page">
    <!-- 面包屑：原平台学员考试页均为「我的学习 / 测练中心 / xxx」三段（实测） -->
    <el-breadcrumb class="exam-crumb" separator="/">
      <el-breadcrumb-item>我的学习</el-breadcrumb-item>
      <el-breadcrumb-item>测练中心</el-breadcrumb-item>
      <el-breadcrumb-item>我的考试</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="layout">
      <!-- 左栏：只放三项统计（契约 01 §S1）。学员关心「还有几场要考」，不是通过率 -->
      <aside class="col-left">
        <div class="user-block">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-name">{{ displayName }}</div>
        </div>
        <div class="stat-list">
          <div v-for="cell in statCells" :key="cell.key" class="stat-cell">
            <span class="stat-value">{{ cell.value }}</span>
            <span class="stat-label">{{ cell.label }}</span>
          </div>
        </div>
      </aside>

      <main class="col-main">
        <!--
          人脸照片提示（2026-11-12，DER-33）。

          为什么用「提示条」而不是一进页就弹窗：
          1. 学员是来考试的，不是来填资料的。弹窗打断会把"参加考试"变成"拒绝拍照"的第一印象。
          2. 录入是选填（用户拍板不强制），强制弹窗容易让人以为是强制采集。
          3. 提示条可以关掉，关了就本次不再烦；弹窗只能"確定"或"取消"，两个都是压力。

          只在确实没录入时才出现（hasBaseline=false）。
        -->
        <el-alert
          v-if="showBaselineTip"
          class="baseline-tip"
          type="info"
          :closable="true"
          show-icon
          @close="baselineTipDismissed = true"
        >
          <template #title>
            <span class="baseline-tip-text">
              还没有录入人脸照片。录入后考试时会比对「是不是同一个人」，更容易通过核验。
              <el-button type="primary" link @click="baselineVisible = true">
                现在录入
              </el-button>
            </span>
          </template>
        </el-alert>

        <!--
          状态未知的弱提示（2026-11-13，台账 16c7）。

          与上面那条刻意区分：上面是「确认没录」→ 引导录入；
          这条是「查不到状态」→ 只能重试。若把两者合成一条，
          学员会以为「点进去就能录」，但接口本身挂了，点进去照样失败。

          type=warning 而不是 info：它是要用户注意的异常，不是常规提示。
        -->
        <el-alert
          v-if="showBaselineUnknown"
          class="baseline-tip"
          type="warning"
          :closable="true"
          show-icon
          @close="baselineTipDismissed = true"
        >
          <template #title>
            <span class="baseline-tip-text">
              暂时无法确认人脸照片状态，不影响参加考试。
              <el-button type="primary" link @click="retryBaseline">重试</el-button>
            </span>
          </template>
        </el-alert>

        <el-skeleton v-if="loading" :rows="6" animated />

        <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon />

        <el-empty v-else-if="!exams.length" description="暂无考试安排" :image-size="96" />

        <template v-else>
          <!-- 三档分组：未开始 / 未通过（可重考） / 已通过。空组不渲染标题，避免三条空栏 -->
          <section v-for="group in visibleGroups" :key="group.key" class="group">
            <div class="group-head">
              <span class="group-title">{{ group.label }}</span>
              <span class="group-count">{{ group.rows.length }}</span>
            </div>
            <ul class="card-grid">
              <li
                v-for="exam in group.rows"
                :key="exam.arrangeId"
                class="exam-card"
                role="button"
                tabindex="0"
                @click="openEntry(exam)"
                @keydown.enter.prevent="openEntry(exam)"
              >
                <div class="card-head">
                  <span class="card-tag">{{ statusText(exam) }}</span>
                  <span v-if="exam.important === 1" class="card-tag is-important">重要</span>
                </div>
                <div class="card-name" :title="exam.name">{{ exam.name }}</div>
                <div class="card-foot">
                  <span class="card-validity">{{ formatEntryRange(exam.entryStartAt, exam.entryEndAt) }}</span>
                  <span v-if="exam.highestScore != null" class="card-score">
                    最高分 {{ exam.highestScore }}
                  </span>
                </div>
              </li>
            </ul>
          </section>
        </template>
      </main>
    </div>

    <FaceBaselineDialog v-model="baselineVisible" @done="onBaselineDone" />
  </div>
</template>

<script setup lang="ts">
/**
 * 学员考试列表页（契约 01 §S1 / 02 §8B.1，接口 04 §11.2）。
 *
 * <p>样式基线取自原平台学员端「待学习」考试卡片实测：卡片 radius 8px、padding 12px、
 * 标签 12px/#595959 底 #f5f5f5、标题 14px/#262626、有效期 14px/#8c8c8c；
 * 学员端强调色沿用已核对过的 #436bff（同 Drillmate 学员端页面），不用全局 #1890ff。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFaceBaseline, listMyExams } from '@/api/studentExam'
import { useAuthStore } from '@/stores/auth'
import type { StudentExamItem } from '@/types/studentExam'
import FaceBaselineDialog from './components/FaceBaselineDialog.vue'
import {
  EXAM_GROUP_META,
  buildStatBuckets,
  formatEntryRange,
  resolveCardGroup,
  sortGroup,
  statusText
} from './examListModel'

const router = useRouter()
const auth = useAuthStore()

const exams = ref<StudentExamItem[]>([])
const loading = ref(true)
const error = ref('')
/**
 * 基准照状态（三态，2026-11-13，台账 16c7）。
 *
 * <p>**为什么必须三态**：原先只有 boolean。接口失败时只能二选一——
 * 当 true 会掩盖「真的没录」导致提示条永不出现（原 bug，台账 7cbc）；
 * 当 false 又会在接口挂掉时误报「没录」并弹录入框，学员点进去可能仍失败。
 * 这两个都是把「不知道」硬拗成「知道」。
 *
 * <p>三态语义：unknown = 还没查/查询失败（只给可重试的弱提示，不弹框）；
 * yes = 确认已录入（不提示）；no = 确认未录入（正常提示并允许录入）。
 */
type BaselineState = 'unknown' | 'yes' | 'no'
const baselineState = ref<BaselineState>('unknown')

/** `baselineTipDismissed` 让学员能关掉；`baselineVisible` 控制弹窗 */
const baselineTipDismissed = ref(false)
const baselineVisible = ref(false)

/** 确认未录入 → 才弹录入引导 */
const showBaselineTip = computed(
  () => !loading.value && !error.value && baselineState.value === 'no' && !baselineTipDismissed.value
)

/**
 * 状态未知的弱提示（不影响考试列表，可点重试）。
 *
 * <p>与 showBaselineTip 互斥：一个是「确认没录」（可引导录入），
 * 一个是「不知道」（只能重试）。混在一起学员分不清该做什么。
 */
const showBaselineUnknown = computed(
  () => !loading.value && !error.value && baselineState.value === 'unknown' && !baselineTipDismissed.value
)

/** 重查基准照状态；成功落到 yes/no，失败保持 unknown 并允许再次重试 */
const loadBaseline = async () => {
  try {
    const state = await getFaceBaseline()
    baselineState.value = state?.hasBaseline === true ? 'yes' : 'no'
  } catch {
    // 查询失败 = 不知道。不猜测、不弹录入框，让学员可以手动重试。
    baselineState.value = 'unknown'
  }
}
/*
 * 人脸照片提示（DER-33 / 台账 16c7）。
 *
 * 状态判断见上方 baselineState 三态；这里只留一句提醒：
 * 查询失败不影响考试列表本身，只影响「要不要提示录入」。
 */
onMounted(async () => {
  await loadBaseline()
})

/** 录入完成后刷新状态；跳过则不重复提示（本次页面生命周期内） */
const onBaselineDone = (saved: boolean) => {
  if (saved) {
    baselineState.value = 'yes'
  } else {
    baselineTipDismissed.value = true
  }
}

/** 「状态未知」时的重试入口：清掉已忽略标记后重查 */
const retryBaseline = () => {
  baselineTipDismissed.value = false
  void loadBaseline()
}

const userInitial = computed(() => auth.userInitial || '学')
const displayName = computed(() => auth.displayName || '学员')

const buckets = computed(() => buildStatBuckets(exams.value))

/** 左侧三项统计，顺序固定：待考 → 进行中 → 已完成 */
const statCells = computed(() => [
  { key: 'notStarted', label: '待考', value: buckets.value.notStarted },
  { key: 'inProgress', label: '进行中', value: buckets.value.inProgress },
  { key: 'finished', label: '已完成', value: buckets.value.finished }
])

/** 按三档分组并按组内规则排序；空组直接过滤掉，页面不留空标题 */
const visibleGroups = computed(() => {
  const grouped = new Map<string, StudentExamItem[]>()
  for (const exam of exams.value) {
    const key = resolveCardGroup(exam)
    const rows = grouped.get(key) ?? []
    rows.push(exam)
    grouped.set(key, rows)
  }
  return EXAM_GROUP_META.filter((meta) => grouped.has(meta.key)).map((meta) => ({
    ...meta,
    rows: sortGroup(meta.key, grouped.get(meta.key) ?? [])
  }))
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await listMyExams()
    exams.value = data?.records ?? []
  } catch (e) {
    // 拦截器已统一提示过 code≠0；这里只留可读的页面内错误态，避免整页空白
    error.value = e instanceof Error ? e.message : '考试列表加载失败'
  } finally {
    loading.value = false
  }
}

/**
 * 卡片点击的落点（2026-11-13 按原平台链路重排）。
 *
 * <p>**原平台链路**：考试练习列表 →（点卡片）→ **考试结果页** →
 * （再次考试）→ 考试概览/入场页 →（查看详情）→ 回结果页 →（查看答题详情）→ 看卷子。
 *
 * <p>**原先我方的做法**是一律进入场页（`/entry`），与用户实际使用习惯相反：
 * 大多数人点卡片是想看「我上次考了多少」，而不是再考一次。
 *
 * <p>**判定依据** `lastAttemptId`（后端 2026-11-13 新增）：
 * <ul>
 *   <li>有值 → 进结果页（该卷已交卷，有分数可看）</li>
 *   <li>为 null → 进入场页（从没交过卷，或只开考未交卷，需要去考/继续考）</li>
 * </ul>
 * 不用 `studentStatus` 判断：`in_progress` 时还没有结果可看，但 `grading`
 * 状态的结果页本身就是「批阅中」空态，看它是合理的，不该逼用户再考一次。
 */
const openEntry = (exam: StudentExamItem) => {
  if (exam.lastAttemptId) {
    router.push(`/exam/student/attempts/${exam.lastAttemptId}/result`)
    return
  }
  router.push(`/exam/student/exams/${exam.arrangeId}/entry`)
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 尺寸基线：内容区 1320px 居中（与 Drillmate 学员端一致），左栏 280px + 主区 1fr */
.exam-list-page {
  max-width: 1320px;
  margin: 0 auto;
}

@media (max-width: 1360px) {
  .exam-list-page {
    padding-inline: 16px;
  }
}

.exam-crumb {
  margin-bottom: 16px;
  font-size: 14px;
}

/* 面包屑配色照原平台：当前页深色、上级浅灰 */
:deep(.el-breadcrumb__inner) {
  color: #8c8c8c;
  font-weight: 400;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #262626;
}

.layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  padding-bottom: 56px;
}

.col-left {
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
}

.user-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #436bff;
  color: #ffffff;
  font-size: 28.8px;
  line-height: 72px;
  text-align: center;
}

.user-name {
  margin-top: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
  color: #262626;
}

/* 三项统计纵向排列：每行「数字 + 名称」，左侧对齐比居中更容易扫读 */
.stat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-cell {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  background: #f7f8fa;
}

.stat-value {
  font-size: 20px;
  line-height: 1;
  font-weight: 700;
  color: #262626;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 13px;
  line-height: 20px;
  color: #8c8c8c;
}

.col-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.group-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
  color: #262626;
}

.group-count {
  font-size: 13px;
  line-height: 20px;
  color: #8c8c8c;
}

/* 卡片网格：原平台「待学习」为横向平铺卡片（301px 宽），这里用自适应三列 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.exam-card {
  display: flex;
  flex-direction: column;
  min-height: 132px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: #436bff;
    box-shadow: 0 2px 8px rgba(67, 107, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid #436bff;
    outline-offset: 2px;
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 标签尺寸照原平台实测：12px / 高 20px / 圆角 2px / 左右内边距 8px */
.card-tag {
  padding: 0 8px;
  border-radius: 2px;
  background: #f5f5f5;
  color: #595959;
  font-size: 12px;
  line-height: 20px;

  &.is-important {
    background: #fff1f0;
    color: #f5222d;
  }
}

/* 标题区撑满，让底部有效期始终贴底对齐，不同长度名称不会把卡片撑成高低不齐 */
.card-name {
  flex: 1;
  margin-top: 8px;
  font-size: 14px;
  line-height: 24px;
  color: #262626;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
  line-height: 22px;
  color: #8c8c8c;
}

.card-validity {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-score {
  flex-shrink: 0;
  color: #436bff;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
