<!--
  员工端首页「学习任务」卡（契约 02 §8B.5）。

  <p>三个 tab 对应三个模块的真实数据源，卡片三档状态统一为
  `未开始 / 未通过（可重考） / 已通过`：
  - 考试 → `listMyExams`（§11.2），三档由 `examListModel.resolveCardGroup` 派生，
    与「我的考试」列表**同一口径**（同一份数据不能出两种分组结果）；
  - 话术训练 → `getStudentProjects`；
  - 实战训练 → `getStudentHomeSummary().themes`。

  <p>**DER-09：v1 只展示已有数据，不做任务派发**。话术/实战两模块目前都没有
  「任务分配」实体，硬做一个派发开关就是空转；所以这里只读不移，点击整卡跳对应页面。

  <p>三个 tab 各有独立的加载态与空态：某个模块接口挂了不该把整张卡拖成空白，
  学员至少还能看到另外两个模块的任务。
-->
<template>
  <section class="learning-task">
    <header class="task-head">
      <h2 class="task-title">学习任务</h2>
      <el-tabs v-model="activeTab" class="task-tabs">
        <el-tab-pane label="考试" name="exam" />
        <el-tab-pane label="话术训练" name="speech" />
        <el-tab-pane label="实战训练" name="combat" />
      </el-tabs>
    </header>

    <el-skeleton v-if="current.loading" :rows="2" animated />

    <!-- 单个模块失败只影响自己的 tab，不弹全局错误 -->
    <p v-else-if="current.error" class="task-error">{{ current.error }}</p>

    <p v-else-if="!current.items.length" class="task-empty">暂无学习任务</p>

    <ul v-else class="task-grid">
      <li
        v-for="item in current.items"
        :key="item.key"
        class="task-card"
        role="button"
        tabindex="0"
        @click="open(item)"
        @keydown.enter.prevent="open(item)"
      >
        <div class="task-card__head">
          <span class="task-tag" :class="`is-${item.group}`">{{ groupText(item.group) }}</span>
          <span v-if="item.important" class="task-tag is-important">重要</span>
        </div>

        <p class="task-card__name" :title="item.name">{{ item.name }}</p>

        <p class="task-card__meta">
          <span>{{ item.meta }}</span>
          <span v-if="item.extra" class="task-card__extra">{{ item.extra }}</span>
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * 首页学习任务卡。
 *
 * <p>「考试」tab 复用 `examListModel` 的分组口径，而不是在这里另写一套判断：
 * 首页说「未通过（可重考）」而列表页说「未开始」是最典型的信任崩塌点。
 *
 * <p>话术/实战两个 tab 的「通过/未通过」在现有数据里没有统一评分口径，
 * 因此只给 `not_started` 与 `passed` 两档的近似判断，**不硬凑第三档**——
 * 没有分就是没有分，凑一个「未通过」等于编造考核结论。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listMyExams } from '@/api/studentExam'
import { getStudentProjects } from '@/api/student'
import { getStudentHomeSummary } from '@/api/actStudent'
import type { ExamCardGroup } from '@/types/studentExam'
import { formatEntryRange, resolveCardGroup } from '@/views/exam/student/examListModel'

const router = useRouter()

type TabKey = 'exam' | 'speech' | 'combat'

const activeTab = ref<TabKey>('exam')

/** 卡片分档；话术/实战只有两档可用（见组件头注释） */
type CardGroup = ExamCardGroup

interface TaskCard {
  key: string
  name: string
  group: CardGroup
  /** 副信息：考试=有效期，训练=起止时间 */
  meta: string
  /** 右侧补充：最高分/状态 */
  extra?: string
  important?: boolean
  /** 点击跳转目标 */
  path: string
}

interface TabState {
  loading: boolean
  error: string
  items: TaskCard[]
}

const tabs = reactive<Record<TabKey, TabState>>({
  exam: { loading: false, error: '', items: [] },
  speech: { loading: false, error: '', items: [] },
  combat: { loading: false, error: '', items: [] }
})

const current = computed(() => tabs[activeTab.value])

const groupText = (group: CardGroup) => {
  if (group === 'passed') return '已通过'
  if (group === 'failed') return '未通过（可重考）'
  return '未开始'
}

const open = (item: TaskCard) => {
  router.push(item.path)
}

const loadExams = async () => {
  const state = tabs.exam
  state.loading = true
  state.error = ''
  try {
    const data = await listMyExams()
    state.items = (data?.records ?? []).map((exam) => ({
      key: exam.arrangeId,
      name: exam.name,
      group: resolveCardGroup(exam),
      meta: formatEntryRange(exam.entryStartAt, exam.entryEndAt),
      extra: exam.highestScore != null ? `最高分 ${exam.highestScore}` : undefined,
      important: exam.important === 1,
      /*
       * 落点（2026-11-13 修）：**已交卷 → 考试结果页；没交过 → 入场页**。
       *
       * <p>原实现是个坏掉的三目：条件写了 `passed===1 || finished || grading`，
       * 但**两个分支都返回 `/entry`**——判断形同虚设，所以点已考过的卡片
       * 仍进入场页。注释本意是对的（「已考过的看结果」），代码没跟上。
       *
       * <p>判据与学员端「我的考试」列表页保持一致：用 `lastAttemptId`
       * （最近一次已交卷答卷），有值就去结果页。不再用 `studentStatus`：
       * `grading` 的结果页本身就是「批阅中」空态，该让学员看，
       * 而且 `status` 无法拼出结果页需要的 attemptId。
       */
      path: exam.lastAttemptId
        ? `/exam/student/attempts/${exam.lastAttemptId}/result`
        : `/exam/student/exams/${exam.arrangeId}/entry`
    }))
  } catch {
    state.error = '考试任务加载失败'
    state.items = []
  } finally {
    state.loading = false
  }
}

const loadSpeech = async () => {
  const state = tabs.speech
  state.loading = true
  state.error = ''
  try {
    const data = await getStudentProjects({ page: 1, pageSize: 20 })
    state.items = (data?.records ?? []).map((project) => {
      // 话术项目自带 `completed` 布尔（不是分数），所以只有「完成/未完成」两档；
      // 未完成时再看 status 区分「还没开始」与「进行中（可继续）」
      const done = project.completed === true || project.status === 'finished'
      const group: CardGroup = done
        ? 'passed'
        : project.status === 'not_started'
          ? 'not_started'
          : 'failed'
      return {
        key: String(project.projectId),
        name: project.name,
        group,
        meta: `${project.startTime || '--'} ~ ${project.endTime || '--'}`,
        path: '/study/userhome'
      }
    })
  } catch {
    state.error = '话术训练任务加载失败'
    state.items = []
  } finally {
    state.loading = false
  }
}

const loadCombat = async () => {
  const state = tabs.combat
  state.loading = true
  state.error = ''
  try {
    const summary = await getStudentHomeSummary()
    state.items = (summary?.themes ?? []).map((theme) => {
      // 主题卡状态是后端算好的（passed / ended / in_progress / not_started），
      // 直接映射到三档，不在前端重新判定通过与否
      const group: CardGroup =
        theme.status === 'passed'
          ? 'passed'
          : theme.status === 'not_started'
            ? 'not_started'
            : 'failed'
      return {
        key: theme.themeId,
        name: theme.name,
        group,
        // 「N 个场景」比计划时间更能说明任务量（后端已给 scenarioCount）
        meta: `${theme.scenarioCount} 个场景`,
        extra: theme.progress > 0 ? `进度 ${theme.progress}%` : undefined,
        // 实战训练卡应进学员端实战详情，原来错指到话术训练列表（会造成点进去看到别的模块）
        path: `/sparring/web/drillmate/detail/${theme.themeId}`
      }
    })
  } catch {
    state.error = '实战训练任务加载失败'
    state.items = []
  } finally {
    state.loading = false
  }
}

/**
 * 三个 tab 一起预载而不是切 tab 才拉：
 * 顶部 tab 数量要显示「各自有几条」，懒加载会让数字先空后跳，
 * 而这三个接口都是列表级请求，一次并发比来回切更省。
 */
onMounted(() => {
  void loadExams()
  void loadSpeech()
  void loadCombat()
})
</script>

<style scoped lang="scss">
$brand: var(--color-accent);

.learning-task {
  padding: 24px;
  background: var(--color-paper);
  border-radius: 8px;
}

.task-head {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.task-title {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  color: var(--color-ink);
  white-space: nowrap;
}

/* tab 去掉底部多余留白，让它与标题基线对齐 */
.task-tabs {
  flex: 1 1 auto;
  min-width: 0;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
}

.task-error {
  margin: 0;
  padding: 24px 0;
  text-align: center;
  font-size: 14px;
  color: var(--color-error);
}

.task-empty {
  margin: 0;
  padding: 32px 0;
  text-align: center;
  font-size: 14px;
  color: var(--color-muted);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 卡片尺寸基线同「我的考试」列表卡：圆角 8px、padding 12px、无边框仅 hover 描边 */
.task-card {
  display: flex;
  flex-direction: column;
  min-height: 112px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--color-paper-2);
  cursor: pointer;
  // 批注（2026-11-20）：训练/考试/实战任务卡片统一悬停与按下动效，
  // 与话术训练/实战训练的项目卡同一套数值（悬停抬 2px + 投影加深，按下回落收影）。
  // 用 translate 而不是 transform，避免与卡片自身可能的定位变换互相覆盖。
  transition:
    translate var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out);

  &:hover {
    translate: 0 -2px;
    border-color: $brand;
    box-shadow: 0 6px 18px color-mix(in oklab, var(--color-graphite) 12%, transparent);
  }

  &:active {
    translate: 0 0;
    box-shadow: 0 1px 2px color-mix(in oklab, var(--color-graphite) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid $brand;
    outline-offset: 2px;
  }
}

.task-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-tag {
  padding: 0 8px;
  border-radius: 2px;
  background: var(--color-paper-2);
  color: var(--color-muted);
  font-size: 12px;
  line-height: 20px;

  &.is-passed {
    background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper));
    color: var(--color-success);
  }

  &.is-failed {
    background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
    color: var(--color-error);
  }

  &.is-important {
    background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper));
    color: var(--color-error);
  }
}

.task-card__name {
  flex: 1;
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 24px;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-muted);
}

.task-card__extra {
  flex-shrink: 0;
  color: $brand;
  font-variant-numeric: tabular-nums;
}
</style>
