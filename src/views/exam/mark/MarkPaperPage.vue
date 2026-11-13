<template>
  <!-- 批阅答卷页（契约 01 §M3 / 路由 /exam/mark/paper/:attemptId）
       复用 AnswerPaperBody 的 grading 模式，不另做一套 DOM（DER-14 / §9.7） -->
  <div class="mark-paper-page">
    <header class="page-head">
      <el-button class="back-btn" aria-label="返回答卷列表" @click="goBack">‹</el-button>
      <h1 class="page-title">
        {{ isViewMode ? '查看答卷' : `待批阅${pendingCount ? `（${pendingCount}）` : ''}` }}
      </h1>
      <span class="head-student">{{ candidateText }}</span>
    </header>

    <el-skeleton v-if="loading" :rows="10" animated />

    <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon />

    <!--
      三栏布局（2026-11-13，对齐原平台 reviewdetail）：
      左「考生切换栏」 | 中「试卷正文 + 三 tab」 | 右「批阅卡」

      左栏为什么要有：原平台批阅页左侧是「待批阅(N) / 考生 / < 1/N >」窄栏，
      批阅人能在同页内连续翻下一份卷。我方原先没有它，批完一份必须返回答卷列表
      再点开下一份——批 20 份要点 40 次。数据来自新增的 /paper/{attemptId}/queue。
    -->
    <div v-else-if="detail" class="paper-layout has-queue">
      <!-- 左栏：考生切换 -->
      <aside v-if="!isViewMode" class="queue-panel">
        <p class="queue-title">待批阅<span class="queue-count">（{{ queue.total }}）</span></p>
        <div v-if="queue.total" class="queue-student">
          <span class="queue-avatar" aria-hidden="true">{{ avatarChar }}</span>
          <span class="queue-name">{{ candidateText.split('（')[0] }}</span>
        </div>
        <p v-else class="queue-empty">暂无待批阅答卷</p>

        <div class="queue-nav">
          <button
            class="queue-arrow"
            type="button"
            aria-label="上一份"
            :disabled="!canPrev"
            @click="goQueue(-1)"
          >‹</button>
          <span class="queue-index">{{ queueLabel }}</span>
          <button
            class="queue-arrow"
            type="button"
            aria-label="下一份"
            :disabled="!canNext"
            @click="goQueue(1)"
          >›</button>
        </div>
      </aside>

      <main class="paper-main">
        <!-- 信息区：试卷名 + 得分/总分/通过分/提交时间 + 考生信息 -->
        <section class="info-card">
          <header class="info-top">
            <h2 class="info-name">{{ detail.name }}</h2>
            <ResultStamp :state="stampState" />
          </header>

          <div class="info-row">
            <span class="info-item"><em>考试成绩</em>{{ formatPaperScore(detail.score) }}</span>
            <span class="info-item"><em>试卷总分</em>{{ formatScore(detail.totalScore) }}</span>
            <span class="info-item"><em>通过分数</em>{{ formatScore(detail.passScore) }}</span>
            <span class="info-item"><em>提交时间</em>{{ detail.submitAt || DASH }}</span>
          </div>

          <div class="info-row">
            <span class="info-item"><em>考生</em>{{ candidateText }}</span>
            <span class="info-item"><em>部门</em>{{ deptName }}</span>
            <!-- 核验方式与相似度（台账 8caa）：正常核验时也要可见，
                 否则批阅人分不清「只过了活体」和「真的比对过本人」 -->
            <span v-if="identityMethodText" class="info-item"><em>核验方式</em>{{ identityMethodText }}</span>
          </div>

          <!-- 身份核验异常：批阅人要能看到异常与抓拍图，据此决定是否作废（DER-07 / §M3 验收 3） -->
          <div v-if="identityAbnormal" class="identity-block">
            <span class="identity-flag" role="img" aria-label="身份待核对">⚠ 身份待核对</span>
            <span class="identity-text">{{ identityText }}</span>
            <el-button v-if="detail.identityEvidence" link type="primary" @click="showEvidence = true">
              查看核验抓拍
            </el-button>
          </div>
        </section>

        <!--
          批阅状态三 tab（2026-11-13，对齐原平台「全部 / 待批阅 / 已批阅」）。

          原平台在试卷正文顶部放这三个 tab，批阅人可以只看还没批的题，
          批长卷时不用一路滚过已批的部分。过滤是纯前端：题号与已批状态都在本地。
        -->
        <nav class="paper-tabs" role="tablist" aria-label="批阅状态筛选">
          <button
            v-for="t in TABS"
            :key="t.key"
            class="paper-tab"
            :class="{ active: activeTab === t.key }"
            type="button"
            role="tab"
            :aria-selected="activeTab === t.key"
            @click="activeTab = t.key"
          >{{ t.label }}</button>
        </nav>

        <!-- 题目区：grading 模式；DER-14 明确不渲染「按空打分」单选组 -->
        <AnswerPaperBody
          mode="grading"
          :sections="visibleSections"
          :grades="grades"
          @update:grades="onGradesChange"
        />

        <p v-if="!visibleSections.length" class="tab-empty">
          当前筛选下没有题目
        </p>

        <!-- 底部动作条：返回 + 提交（居中，原平台 §8B 实测） -->
        <footer class="action-bar">
          <el-button class="btn-back" @click="goBack">返回</el-button>
          <el-button type="primary" class="btn-submit" :loading="submitting" @click="onSubmit">
            提交
          </el-button>
        </footer>
      </main>

      <!-- 右侧批阅卡：进度 + 图例 + 题号（色块 14×14 / 圆角 2px，§8B 实测） -->
      <aside class="paper-side">
        <section class="card">
          <p class="progress-line">
            已批<span class="progress-num">{{ gradedCount }}</span>/{{ totalCount }}
          </p>

          <div class="legend">
            <span class="legend-item">
              <i class="legend-box legend-box--blank" aria-hidden="true"></i>未批阅
            </span>
            <span class="legend-item">
              <i class="legend-box legend-box--right" aria-hidden="true"></i>正确
            </span>
            <span class="legend-item">
              <i class="legend-box legend-box--wrong" aria-hidden="true"></i>错误
            </span>
          </div>

          <div class="divider" aria-hidden="true"></div>

          <div v-for="group in sheetGroups" :key="group.sectionIndex" class="sheet-group">
            <p class="sheet-group__name">{{ group.sectionName }}</p>
            <div class="sheet-group__items">
              <button
                v-for="item in group.items"
                :key="item.quesId"
                type="button"
                class="sheet-no"
                :class="`is-${item.state}`"
                @click="scrollToQuestion(item.quesId)"
              >
                {{ item.no }}
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- 核验抓拍：用 el-image 是为了拿到内置的大图预览与加载失败占位 -->
    <el-dialog v-model="showEvidence" title="身份核验抓拍" width="520px">
      <el-image
        v-if="detail?.identityEvidence"
        :src="resolveAssetUrl(detail.identityEvidence)"
        fit="contain"
        class="evidence-img"
      >
        <template #error>
          <p class="evidence-error">抓拍图加载失败</p>
        </template>
      </el-image>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 批阅答卷页。
 *
 * <p>与原平台的结构差异（有意简化，记入偏差 §9.7）：原平台 `reviewdetail` 是独立一套 DOM，
 * 我方按契约复用学员答卷详情页的正文组件 `AnswerPaperBody`，只把 `mode` 切成 `grading`。
 * 两套实现必然漂移——「学员看得到答案而批阅人看不到考点」这类不一致会直接导致误判。
 *
 * <p>**DER-14：「按空打分」单选组整组不渲染**。契约 §11B.4 的 `grades[]` 只按 `quesId` 提交，
 * 支持按空需要接口携带 `blankIndex`。显示一个点了也没用的单选组会让批阅人以为按空给分生效了，
 * 那比不显示更糟。
 *
 * <p>打分区本体在 `AnswerPaperBody` 里（每题一个，随三行信息一起），本页只负责
 * 取数、草稿状态与提交。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { getMarkPaper, getMarkQueue, submitMarkPaper } from '@/api/studentExam'
import { resolveAssetUrl } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'
import type { GradeDraft, MarkPaperDetail, MarkQueue, PaperCard, PaperSection } from '@/types/studentExam'
import AnswerPaperBody from '../student/components/AnswerPaperBody.vue'
import ResultStamp from '../student/components/ResultStamp.vue'
import {
  DASH,
  formatPaperScore,
  formatScore,
  resolveStampState
} from '../student/resultModel'
import {
  buildGradePayload,
  countGradedItems,
  flattenScorableItems,
  needsIdentityCheck
} from './markModel'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/**
 * 当前答卷 id —— **必须是 computed**（2026-11-13 修）。
 *
 * <p>原先是 `const attemptId = String(route.params.attemptId ?? '')`，
 * 只在组件创建时算一次。翻页时 router.push 换了 URL、watch 也触发了 load()，
 * 但 load() 读到的仍是创建时那个旧 id —— 结果是「点了下一份，页面还是上一份」，
 * 正是用户实测到的「点击继续后没有正常切换试卷」。
 *
 * <p>改成 computed 后，每次访问都取当前路由参数，翻页才能真正生效。
 */
const attemptId = computed(() => String(route.params.attemptId ?? ''))

/**
 * 从答卷列表点「查看」进来时只看不打分。
 * 用 query 而不是第二个页面：两者只差「打分区是否可交互 + 底部提交按钮」，
 * 拆成两个页面会让正文组件被迫接受一个它本不该关心的「是不是批阅页」参数。
 */
const isViewMode = computed(() => route.query.mode === 'view')

const detail = ref<MarkPaperDetail | null>(null)
const grades = ref<Record<string, GradeDraft>>({})
/**
 * 是否有未提交的打分草稿（翻页前提示用）。
 *
 * <p>`grades` 里只要有任何一条带了分数或判对错，就视为「用户动过手」。
 * 不做深度比较：翻页本身是有意识的操作，多问一句的成本远低于
 * 「辛苦批了 20 题，点下一份全没了」。
 */
const hasPendingDraft = computed(() => Object.keys(grades.value).length > 0)

/* ==================== 批阅状态三 tab（2026-11-13） ==================== */

/**
 * 「全部 / 待批阅 / 已批阅」三档。
 *
 * <p>原平台批阅页顶部就是这三档。批长卷时批阅人常常只想看还没批的题，
 * 一路滚过已批部分很费劲。过滤是纯前端——题号与已批状态都在本地，不需要接口。
 */
const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待批阅' },
  { key: 'graded', label: '已批阅' }
] as const
type TabKey = (typeof TABS)[number]['key']
const activeTab = ref<TabKey>('all')

/**
 * 按 tab 过滤后的题区。
 *
 * <p>判据与 `gradedCount` 保持同一口径（countGradedItems），
 * 否则会出现「右栏说已批 5/16，但『已批阅』tab 里只有 3 题」这种自相矛盾。
 *
 * <p>某一大题下若所有小题都被过滤掉，就把该大题整体丢掉，
 * 不留下只有标题、没有题目的空壳。
 */
const visibleSections = computed(() => {
  const secs = detail.value?.sections ?? []
  if (activeTab.value === 'all') return secs
  const gradedMap = gradedQuesIdSet.value
  const wantGraded = activeTab.value === 'graded'
  return secs
    .map((s) => ({
      ...s,
      cards: (s.cards ?? []).filter((c) => gradedMap.has(c.quesId) === wantGraded)
    }))
    .filter((s) => (s.cards ?? []).length > 0)
})

/**
 * 已批题号集合，供 tab 过滤使用。
 *
 * <p>**必须与 `countGradedItems` 同一口径**，否则右栏说「已批 15/16」而
 * 「已批阅」tab 里只列出 3 题，批阅人会以为有 12 题丢了。实测确实出现过
 * 15 vs 3 的偏差——原因正是这里只认 correctFlag，而右边把「给了分但没判对错」
 * 也算已批（快速批阅只点分数、不点对错是常见操作）。
 *
 * <p>所以判据对齐为：`correctFlag !== null || score !== null`。
 */
const gradedQuesIdSet = computed(() => {
  const out = new Set<string>()
  for (const [quesId, g] of Object.entries(grades.value)) {
    if (!g) continue
    if (g.correctFlag !== null && g.correctFlag !== undefined) { out.add(quesId); continue }
    if (g.score !== null && g.score !== undefined) { out.add(quesId); continue }
  }
  return out
})

/**
 * 拉取批阅队列（左侧「1/N」切换栏的数据源）。
 *
 * <p>**失败不阻断批阅**：队列只是导航辅助，接口挂了也应该能正常批当前这份卷。
 * 所以单独 catch 并把队列置空——左栏显示「暂无待批阅答卷」，主流程不受影响。
 * 不在这里 toast：用户没主动做队列相关操作，弹窗只会干扰。
 */
const loadQueue = async (id: string) => {
  try {
    queue.value = await getMarkQueue(id)
  } catch {
    queue.value = { attemptIds: [], currentIndex: -1, total: 0 }
  }
}
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const showEvidence = ref(false)

const stampState = computed(() =>
  detail.value
    ? resolveStampState({ graded: detail.value.passed != null, passed: detail.value.passed })
    : ('pending' as const)
)

/**
 * 考生姓名串：**取被批阅人，不是当前登录人**（2026-11-13 修）。
 *
 * <p>原实现用 `auth.user`，也就是批阅人自己。批阅人打开别人的答卷时，
 * 头部会显示自己的名字——既误导又掩盖了「这是谁的卷」这个最关键的信息。
 * 后端 PaperDetail 早已下发 account / fullname / deptName（§11B.3 头部信息区），
 * 这里改取 detail，登录态仅作兜底（后端字段缺失时才用）。
 */
const candidateText = computed(() => {
  const name = detail.value?.fullname || detail.value?.account
  if (name) {
    const account = detail.value?.account
    return account && name !== account ? `${name}（${account}）` : name
  }
  // 兜底：后端没给（历史/异常数据）时才退回登录态，并保持原有格式
  const fallback = auth.user?.name || auth.displayName
  const acc = auth.user?.account
  return acc ? `${fallback}（${acc}）` : fallback
})
/** 考生部门：同样取被批阅人的，不取登录人的 */
const deptName = computed(() => detail.value?.deptName || DASH)

/* ==================== 批阅队列（左侧「1/N」切换栏，2026-11-13） ==================== */

/**
 * 待批阅队列。`currentIndex` 为 -1 表示当前卷已不在待批阅集合里
 * （例如从「已批阅」列表点进来查看一份已批完的卷）。
 */
const queue = ref<MarkQueue>({ attemptIds: [], currentIndex: -1, total: 0 })

/** 左栏头像取考生姓名首字 */
const avatarChar = computed(() => (candidateText.value || '?').slice(0, 1))

/**
 * 「第几份 / 共几份」。当前卷不在队列里时只说总数——
 * 硬报「1/1」会让批阅人以为这是待批的第一份。
 */
const queueLabel = computed(() => {
  if (!queue.value.total) return '0/0'
  const i = queue.value.currentIndex
  return i >= 0 ? `${i + 1}/${queue.value.total}` : `-/${queue.value.total}`
})

const canPrev = computed(() => queue.value.currentIndex > 0)
const canNext = computed(
  () => queue.value.currentIndex >= 0 && queue.value.currentIndex < queue.value.total - 1
)

/**
 * 翻上一份/下一份。
 *
 * <p>用 router.push 换 attemptId 而不是整页刷新：路由参数变化会触发
 * `onMounted` 之外的重取（本页 watch route.params），未提交的批阅草稿随之丢弃——
 * 所以翻页前若已打过分，先确认，避免用户辛苦批的内容无声消失。
 */
const goQueue = (delta: number) => {
  const next = queue.value.attemptIds[queue.value.currentIndex + delta]
  if (!next) return
  if (hasPendingDraft.value) {
    ElMessageBox.confirm(
      '当前答卷还有未提交的打分，翻页会丢失，确定继续吗？',
      '确认翻页',
      { confirmButtonText: '继续', cancelButtonText: '留在此页', type: 'warning' }
    )
      .then(() => router.push(`/exam/mark/paper/${next}`))
      .catch(() => {})
    return
  }
  router.push(`/exam/mark/paper/${next}`)
}


/** 身份核验异常（2 不通过 / 3 无法核验）；0 未核验不算异常，避免全员带警告 */
const identityAbnormal = computed(() => needsIdentityCheck(detail.value?.identityStatus))

const identityText = computed(() => {
  switch (detail.value?.identityStatus) {
    case 2:
      return '人脸核验未通过'
    case 3:
      return '无法完成人脸核验（设备或服务异常）'
    default:
      return ''
  }
})

/**
 * 核验方式文案（台账 8caa）。
 *
 * <p>为何要区分：`identityStatus=1` 只回答“是不是活人”，没回答“是不是本人”。
 * 只做活体时把相似度藏起来，等于让批阅人凭感觉判断证据够不够。
 * 历史数据没存 identityMethod，此时整段不渲染（不回退成“未知”，避免噪声）。
 */
const identityMethodText = computed(() => {
  const method = detail.value?.identityMethod
  if (method === 2) {
    const score = detail.value?.identityScore
    // 相似度后端存 0..1，展示取整百分数；字段缺失时只报方式，不编造数字
    return score == null
      ? '活体 + 人脸比对'
      : `活体 + 人脸比对（相似度 ${Math.round(score * 100)}%）`
  }
  if (method === 1) {
    return '仅活体检测（未做照片比对）'
  }
  return ''
})

/**
 * 可评项（组合题按子题铺平、父题不计）。
 * 口径与单测共用 `flattenScorableItems`，避免页面和测试各写一套。
 */
const items = computed(() => flattenScorableItems(detail.value?.sections))

const totalCount = computed(() => items.value.length)

/** 已批 = 判了对错或给了分；初始状态来自后端下发的 grades */
const gradedCount = computed(() => countGradedItems(items.value, grades.value))

/** 头部「待批阅（N）」：进入时还没批的数量 */
const pendingCount = computed(() => Math.max(0, totalCount.value - gradedCount.value))

type SheetState = 'right' | 'wrong' | 'blank'

interface SheetGroup {
  sectionIndex: number
  sectionName: string
  items: { quesId: string; no: string; state: SheetState }[]
}

/**
 * 右侧批阅卡：按大题分组的题号块。
 *
 * <p>内部变量叫 `cells` 而不是 `items`——外层已有 `items`（可评项，供提交与计数用），
 * 同名会遮蔽外层变量，属于「看着能跑、改一处就错」的隐患。
 */
const sheetGroups = computed<SheetGroup[]>(() => {
  const sections: PaperSection[] = detail.value?.sections ?? []
  return sections.map((sec) => {
    const cells: SheetItem[] = []
    sec.cards.forEach((card, i) => {
      const subs = card.subQuestions ?? []
      if (subs.length) {
        subs.forEach((sub, si) => {
          cells.push({ quesId: sub.quesId, no: `${i + 1}-${si + 1}`, state: stateOf(sub) })
        })
      } else {
        cells.push({ quesId: card.quesId, no: String(i + 1), state: stateOf(card) })
      }
    })
    return { sectionIndex: sec.sectionIndex, sectionName: sec.sectionName, items: cells }
  })
})

interface SheetItem {
  quesId: string
  no: string
  state: SheetState
}

/** 批阅卡状态看草稿：绿=判对，红=判错，白=没判 */
function stateOf(card: PaperCard): SheetState {
  const flag = grades.value[card.quesId]?.correctFlag ?? null
  if (flag === 1) return 'right'
  if (flag === 0) return 'wrong'
  return 'blank'
}

const onGradesChange = (next: Record<string, GradeDraft>) => {
  grades.value = next
}

const scrollToQuestion = (quesId: string) => {
  document.getElementById(`ques-${quesId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const load = async () => {
  if (!attemptId.value) {
    error.value = '缺少答卷 id'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  // 队列与答卷详情并行取：队列失败不该阻断批阅，所以单独 catch 保持空队列
  void loadQueue(attemptId.value)
  try {
    const data = await getMarkPaper(attemptId.value)
    detail.value = data
    grades.value = buildInitialGrades(data)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '答卷加载失败'
  } finally {
    loading.value = false
  }
}

/**
 * 用后端已下发的 `grades` 初始化草稿。
 *
 * <p>「重新批阅」时必须回显上次的分数，否则批阅人看不到自己之前给了多少分，
 * 改分就成了盲改。没有 `grades`（首次批阅）时留空草稿。
 */
const buildInitialGrades = (data: MarkPaperDetail): Record<string, GradeDraft> => {
  const out: Record<string, GradeDraft> = {}
  for (const g of data.grades ?? []) {
    out[g.quesId] = {
      correctFlag: g.correctFlag,
      score: g.score,
      comment: g.comment ?? ''
    }
  }
  return out
}

/**
 * 提交批阅。
 *
 * <p>只提交**已给分/已判对错**的题：把没动过的题也带上 `score:null` 会覆盖后端已有判分
 * （客观题是系统判的，批阅人没碰就不该出现在 payload 里）。
 */
const onSubmit = async () => {
  if (isViewMode.value) return

  // 生成逻辑抽到 markModel.buildGradePayload（有单测守着「没动过的题不进 payload」）
  const payload = buildGradePayload(items.value, grades.value)

  if (!payload.length) {
    toast.warn('还没有给任何题目打分')
    return
  }

  submitting.value = true
  try {
    await submitMarkPaper(attemptId.value, { grades: payload })
    toast.success('批阅已提交')
    // 提交后回列表刷新状态（契约 §M3：刷新 M1/M2 列表由列表页自己 onMounted 拉取）
    router.back()
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

const goBack = () => router.back()

onMounted(load)

/**
 * 翻页重取（2026-11-13）。
 *
 * <p>左侧「1/N」切换栏用 router.push 换 attemptId，路径参数变了但组件会复用
 * （同一个路由记录），`onMounted` 不会再跑一次 —— 不监听的话，点了下一份
 * 页面还显示上一份的内容。这里 watch 参数并重新 load。
 *
 * <p>同时清空草稿：草稿是「上一份卷」的，带过来会张冠李戴。
 */
watch(
  () => route.params.attemptId,
  (next, prev) => {
    if (!next || next === prev) return
    grades.value = {}
    detail.value = null
    void load()
  }
)
</script>

<style scoped lang="scss">
$brand: #436bff;

.mark-paper-page {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  /*
   * 左右 24px（2026-11-13 修）：原先是 16px 四边，用户实测"文字处于边缘"。
   * 参照原平台实测（ote-review-fixed-head pad 20px 16px + exam_title pad 0 20px），
   * 内容距容器左边缘约 24px。上下保持 16px 不变，避免整体过于松散。
   */
  padding: 16px 24px;
  background: #f5f6f8;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #262626;
  font-size: 16px;
  line-height: 1;

  &:hover {
    border-color: $brand;
    color: $brand;
  }
}

.page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #262626;
}

.head-student {
  font-size: 14px;
  color: #8c8c8c;
}

/*
 * 三栏：左「考生切换栏 156px」| 中「试卷正文」| 右「批阅卡 282px」。
 *
 * 左栏 156px：原平台实测约 150px，能放下「待批阅(N)」+ 头像姓名 + 「< 1/N >」，
 * 再窄就会把姓名挤成竖排（这个坑在考生列表的姓名列踩过）。
 * has-queue 只在批阅模式加，查看答卷时不显示左栏。
 */
.paper-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 282px;
  gap: 16px;
  align-items: start;

  &.has-queue {
    grid-template-columns: 156px minmax(0, 1fr) 282px;
  }
}

/* ---- 左侧考生切换栏 ---- */
.queue-panel {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  background: #fff;
  border-radius: 4px;
}

.queue-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.queue-count {
  color: #8c8c8c;
  font-weight: 400;
}

.queue-student {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* 头像用姓名首字：原平台是圆形头像位，没有真实头像时用首字占位比空白更可读 */
.queue-avatar {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e6eeff;
  color: #436bff;
  font-size: 14px;
  line-height: 32px;
  text-align: center;
}

.queue-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #262626;
}

.queue-empty {
  margin: 0;
  font-size: 12px;
  color: #8c8c8c;
}

.queue-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.queue-arrow {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #262626;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) { border-color: #436bff; color: #436bff; }
  &:disabled { color: #d9d9d9; cursor: not-allowed; }
}

/* ---- 批阅状态三 tab（2026-11-13）---- */
.paper-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 4px 12px;
  border-bottom: 1px solid #e9e9e9;
}

.paper-tab {
  padding: 0 0 8px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #8c8c8c;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover { color: #436bff; }
  &.active {
    color: #436bff;
    border-bottom-color: #436bff;
    font-weight: 500;
  }
}

.tab-empty {
  margin: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #8c8c8c;
}

.queue-index {
  font-size: 13px;
  color: #262626;
  white-space: nowrap;
}

.paper-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  padding: 20px 24px;
  background: #fff;
  border-radius: 8px;
}

.info-top {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.info-name {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 18px;
  line-height: 26px;
  font-weight: 500;
  color: #262626;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: #262626;
}

.info-item {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;

  em {
    font-style: normal;
    color: #8c8c8c;
  }
}

/* 身份异常块：浅橙底，跟答卷正文的浅灰块区分开 */
.identity-block {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  background: #fff7e6;
}

.identity-flag {
  padding: 0 6px;
  border-radius: 2px;
  background: #ffe7ba;
  color: #d46b08;
  font-size: 12px;
  line-height: 20px;
}

.identity-text {
  font-size: 13px;
  line-height: 20px;
  color: #d46b08;
}

.paper-side {
  position: sticky;
  top: 16px;
}

.card {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.progress-line {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 22px;
  color: #262626;
}

.progress-num {
  color: $brand;
  font-weight: 500;
}

.legend {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 20px;
  color: #595959;
}

.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;

  &--blank {
    border: 1px solid #d9d9d9;
    background: #fff;
  }

  &--right {
    background: #d7f7c1;
  }

  &--wrong {
    background: #fef2f0;
  }
}

.divider {
  height: 1px;
  margin: 16px 0;
  background: #f0f0f0;
}

.sheet-group {
  margin-top: 16px;
}

.sheet-group__name {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 22px;
  color: #595959;
}

.sheet-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sheet-no {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  background: #fff;
  color: #595959;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;

  &:hover {
    border-color: $brand;
    color: $brand;
  }

  &:focus-visible {
    outline: 2px solid $brand;
    outline-offset: 2px;
  }

  &.is-right {
    border-color: #d7f7c1;
    background: #d7f7c1;
    color: #389e0d;
  }

  &.is-wrong {
    border-color: #fef2f0;
    background: #fef2f0;
    color: #f5222d;
  }
}

/* 底部动作条：居中，返回为次要、提交为主色（原平台 §8B 实测） */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 32px;
}

.btn-back {
  width: 96px;
  border-radius: 4px;
}

.btn-submit {
  width: 96px;
  border-radius: 4px;
  background: $brand;
  border-color: $brand;
}

.evidence-img {
  width: 100%;
  max-height: 380px;
}

.evidence-error {
  margin: 0;
  padding: 40px 0;
  text-align: center;
  color: #8c8c8c;
}

@media (max-width: 1100px) {
  .paper-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .paper-side {
    position: static;
  }
}
</style>
