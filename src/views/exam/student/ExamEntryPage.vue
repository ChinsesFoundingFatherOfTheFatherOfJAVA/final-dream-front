<template>
  <div class="exam-entry-page">
    <!-- 面包屑在卡片外上方（原平台实测 y101..112，x 与卡片内容左边界对齐） -->
    <el-breadcrumb class="entry-crumb" separator="/">
      <el-breadcrumb-item>我的学习</el-breadcrumb-item>
      <!-- 原平台实测「测练中心」带 is-link，可点回考试列表（台账 9862） -->
      <el-breadcrumb-item :to="{ path: '/exam/student/exams' }">测练中心</el-breadcrumb-item>
      <el-breadcrumb-item>考试预览</el-breadcrumb-item>
    </el-breadcrumb>

    <el-skeleton v-if="loading" :rows="8" animated class="entry-card" />

    <el-alert
      v-else-if="error"
      class="entry-card entry-alert"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <template v-else-if="entry">
      <!-- 白色卡片：实测宽 1200、圆角 8、上下内边距 40 -->
      <section class="entry-card">
        <h1 class="entry-title">{{ entry.name }}</h1>
        <p class="entry-time">{{ timeText }}</p>

        <!--
          信息网格：实测 `#fafafa`、1000×250、圆角 4、**2 列**、中线 1px `#f0f0f0`。
          每格 = 图标(20) + 8 间距 + 标签 + 值，行距 58。
          8 项顺序由 entryModel.buildEntryInfoCells 固定（行优先），不能在这里重排。
        -->
        <div class="info-grid">
          <div v-for="cell in infoCells" :key="cell.key" class="info-cell">
            <span class="info-icon" aria-hidden="true" v-html="iconOf(cell.key)"></span>
            <span class="info-label">{{ cell.label }}</span>
            <span class="info-value">{{ cell.value }}</span>
          </div>
        </div>

        <!-- 考试结果条：已考过才出现。实测高 88、底 #fff8f6、圆角 4 -->
        <template v-if="entry.lastResult">
          <h2 class="section-title">考试结果</h2>
          <div class="result-strip" :class="{ 'is-passed': resultPassed }">
            <div class="result-main">
              <span class="result-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.6" />
                  <path
                    d="M10 5.6v5.6M10 14.1v.6"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <div class="result-text">
                <div class="result-status">{{ resultStatus }}</div>
                <div class="result-his">
                  <span class="his-label">历史最高分</span>
                  <span class="his-value">{{ resultScore }}</span>
                </div>
              </div>
            </div>
            <el-button
              v-if="entry.lastResult.answerDetailAvailable"
              class="result-detail-btn"
              @click="goDetail"
            >
              查看详情
            </el-button>
            <el-tooltip
              v-else-if="entry.lastResult.answerDetailBlockReason"
              :content="entry.lastResult.answerDetailBlockReason"
              placement="top"
            >
              <span class="result-detail-disabled">
                <el-button class="result-detail-btn" disabled>查看详情</el-button>
              </span>
            </el-tooltip>
          </div>
        </template>

        <h2 class="section-title">答卷须知</h2>
        <p class="notice-text">
          可以使用试题后的
          <span class="notice-mark" aria-label="标记按钮">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <path
                d="M4 2.5v11M4 2.5h7.2l-1.6 2.8 1.6 2.8H4"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          标记按钮，标记不确定的试题，标记后能快速定位。如果考试限定时间，请在倒计时结束前完成答卷，倒计时结束时自动交卷。如果你已经准备好了，请点击“开始考试”按钮即开始考试，开始计时。
        </p>

        <!-- 不可开考原因如实展示（契约 01 §S2：未到入场时间/已结束/次数用完） -->
        <p v-if="blockedReason" class="block-reason">{{ blockedReason }}</p>

        <div class="entry-actions">
          <el-button
            type="primary"
            class="start-btn"
            :disabled="!entry.canStart"
            :loading="starting"
            @click="onStartClick"
          >
            {{ buttonText }}
          </el-button>
        </div>
      </section>
    </template>

    <!-- 前置流程：声明 → 签名 → 人脸核验 → 开始（顺序由契约 01 §S3 固定） -->
    <PreExamSignDialog
      v-model="signVisible"
      stage="pre"
      :submit="onSignSubmit"
    />

    <FaceVerifyDialog v-model="faceVisible" :baseline-url="baselineUrl" @finish="onFaceFinish" />

    <el-dialog
      v-model="declareVisible"
      title="考前声明"
      width="480px"
      :close-on-click-modal="false"
      align-center
      @closed="declareAccepted = false"
    >
      <p class="declare-text">{{ declareText }}</p>
      <el-checkbox v-model="declareAccepted">我已阅读并同意上述声明</el-checkbox>
      <template #footer>
        <el-button @click="declareVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!declareAccepted" @click="onDeclareConfirm">
          确认并继续
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 学员考试入场页（契约 01 §S2 / §S3，接口 04 §11.3–11.6，样式见
 * 《原平台样式观察细节》§1/§2 与 2026-11-10 逐像素实测）。
 *
 * <p>前置流程严格按 **声明 → 签名 → 人脸核验 → 开始** 的顺序串行推进，
 * 中间任一步取消就整体中止（不偷偷跳过），因为签名/声明是学员的确认动作。
 * 人脸核验是唯一例外：它无论如何都会放行（DER-07）。
 *
 * <p>样式基线全部来自实测而非估算，关键值：卡片宽 1200 / 左右内边距 100 /
 * 标题 20px 居中 / 网格 1000×250 两列 / 主按钮 112×40 底色 #436bff。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import {
  getExamEntry,
  getExamPreCheck,
  getFaceBaseline,
  reportFaceVerify,
  startExam,
  submitExamDeclare,
  submitExamSign
} from '@/api/studentExam'
import { uploadExamFile } from '@/api/exam'
import type { ExamPreCheck, StudentExamEntry } from '@/types/studentExam'
import {
  blockHint,
  buildEntryInfoCells,
  entryTimeText,
  lastResultPassed,
  lastResultScoreText,
  lastResultStatusText,
  normalizeExamFileUrl,
  startButtonText
} from './entryModel'
import PreExamSignDialog from './components/PreExamSignDialog.vue'
import FaceVerifyDialog from './components/FaceVerifyDialog.vue'
import type { FaceVerifyResult } from './faceVerifyModel'

const route = useRoute()
const router = useRouter()

const arrangeId = computed(() => String(route.params.arrangeId ?? ''))

const entry = ref<StudentExamEntry | null>(null)
const loading = ref(true)
const error = ref('')
const starting = ref(false)

const signVisible = ref(false)
const faceVisible = ref(false)
const declareVisible = ref(false)
const declareAccepted = ref(false)

/** 前置步骤状态：签名接口返回 signId，start 时回传绑定答卷 */
const signId = ref('')
const declareAcceptedFlag = ref(false)

/**
 * 暂存的人脸核验结果，等 `start` 拿到 attemptId 后补报（DER-29）。
 *
 * <p>为何不一弹出就报：`POST /attempts/{id}/face-verify` 需要 attemptId，
 * 而答卷是 `start` 时才创建的——核验弹窗在 `start` 之前，此刻根本没有 id。
 * 旧实现这里只传证据图、完全不报状态，导致 `identity_status` 永远是 0。
 */
let pendingIdentity: {
  status: number
  snapshot: string | null
  /** 核验手段（DER-34）：1 仅活体 / 2 活体 + 比对 */
  method: number
  /** 比对相似度 0..1；未比对为 null */
  similarity: number | null
} | null = null

/**
 * 学员已有的人脸基准照（DER-34）。
 *
 * <p>为空就不做比对，走纯活体路径——那样不会加载额外的 6.7MB 特征模型。
 * 查询失败也当未录入：比对是增强项，不能因为它挂了而挡住核验。
 */
const baselineUrl = ref<string | null>(null)

const infoCells = computed(() => (entry.value ? buildEntryInfoCells(entry.value) : []))
const timeText = computed(() => (entry.value ? entryTimeText(entry.value) : ''))
const buttonText = computed(() => startButtonText(entry.value))
const blockedReason = computed(() => blockHint(entry.value))

const resultStatus = computed(() => lastResultStatusText(entry.value?.lastResult ?? null))
const resultScore = computed(() => lastResultScoreText(entry.value?.lastResult ?? null))
const resultPassed = computed(() => lastResultPassed(entry.value?.lastResult ?? null))

/** 契约未定义声明正文，给一条覆盖「诚信考试」要点的默认文案，避免空白弹窗 */
const declareText =
  '本人承诺：本次考试由本人独立完成，不携带、不查阅任何与考试内容相关的资料，' +
  '不使用任何作弊工具，不协助他人作弊。如有违反，愿意承担相应后果。'

/**
 * 网格图标：原平台是 20×20 内联线性 SVG（不是 icon 字体），
 * 按参数表逐项给形状——图标和标签语义对不上会让学员看错行。
 */
const ICONS: Record<string, string> = {
  // 试卷总分：九宫格
  totalScore:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<rect x="2.6" y="2.6" width="5.6" height="5.6" rx="1"/><rect x="11.8" y="2.6" width="5.6" height="5.6" rx="1"/>' +
    '<rect x="2.6" y="11.8" width="5.6" height="5.6" rx="1"/><rect x="11.8" y="11.8" width="5.6" height="5.6" rx="1"/></svg>',
  // 通过分数：日历 + 勾
  passScore:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<rect x="2.6" y="4" width="14.8" height="13.4" rx="2"/><path d="M2.6 8h14.8M6.6 2.6v2.8M13.4 2.6v2.8"/>' +
    '<path d="M6.6 12.2l2.2 2.2 4.4-4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 试题总数：列表
  questionCount:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<rect x="3.4" y="2.6" width="13.2" height="14.8" rx="2"/><path d="M6.6 7.4h6.8M6.6 10.6h6.8M6.6 13.8h4.2" stroke-linecap="round"/></svg>',
  // 优秀分数：奖章
  excellentScore:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<circle cx="10" cy="8.2" r="5"/><path d="M7.2 12.4l-1 4.8 3.8-1.9 3.8 1.9-1-4.8" stroke-linejoin="round"/></svg>',
  // 考试限时：时钟
  limitMinutes:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<circle cx="10" cy="10" r="7.6"/><path d="M10 5.6V10l3 1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 考试次数：文件 + 笔
  usedTimes:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<path d="M4.6 2.6h8l3.2 3.2v11.6H4.6z" stroke-linejoin="round"/><path d="M12.4 2.6v3.4h3.4"/>' +
    '<path d="M7 13.2l.5-2.1 3.5-3.5 1.6 1.6-3.5 3.5z" stroke-linejoin="round"/></svg>',
  // 交卷时间：日历
  submitAt:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<rect x="2.6" y="4" width="14.8" height="13.4" rx="2"/><path d="M2.6 8h14.8M6.6 2.6v2.8M13.4 2.6v2.8"/>' +
    '<path d="M6.4 11.4h2.2M11.4 11.4h2.2M6.4 14.4h2.2" stroke-linecap="round"/></svg>',
  // 考生姓名：人像
  fullname:
    '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.2">' +
    '<rect x="2.6" y="2.6" width="14.8" height="14.8" rx="2"/><circle cx="10" cy="8" r="2.4"/>' +
    '<path d="M5.8 15.2c.5-2.2 2.2-3.4 4.2-3.4s3.7 1.2 4.2 3.4" stroke-linecap="round"/></svg>'
}

const iconOf = (key: string): string => ICONS[key] ?? ''

const load = async () => {
  loading.value = true
  error.value = ''
  if (!arrangeId.value) {
    error.value = '缺少考试标识，无法打开入场页'
    loading.value = false
    return
  }
  try {
    entry.value = await getExamEntry(arrangeId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '考试信息加载失败'
  } finally {
    loading.value = false
  }
}

/**
 * 点「开始考试」：先拉 pre-check 决定要弹几步。
 *
 * <p>`needDeclare` / `needSignature` / `needFaceVerify` 三个开关决定流程，
 * 全关时直接开考——不能因为「反正有前置流程」就固定弹窗。
 */
const onStartClick = async () => {
  if (!entry.value?.canStart || starting.value) return
  let pre: ExamPreCheck | null = null
  try {
    pre = await getExamPreCheck(arrangeId.value)
  } catch {
    // pre-check 失败不阻断：按「无需前置步骤」继续，让 start 接口做最终校验
    // （start 会用 40052 拒绝未完成的前置步骤，比前端硬编码更可信）
    pre = null
  }
  if (pre && pre.canStart === false) {
    toast.warn(pre.blockReason || '当前不可开始考试')
    return
  }
  advance({ pre })
}

/** 按「声明 → 签名 → 人脸」顺序推进到下一个未完成的步骤 */
const advance = (ctx: { pre: ExamPreCheck | null }) => {
  const pre = ctx.pre
  if (pre?.needDeclare === 1 && !declareAcceptedFlag.value) {
    declareVisible.value = true
    return
  }
  if (pre?.needSignature === 1 && !signId.value) {
    signVisible.value = true
    return
  }
  if (pre?.needFaceVerify === 1) {
    faceVisible.value = true
    return
  }
  void doStart()
}

/** 声明确认：落库后继续走下一步 */
const onDeclareConfirm = async () => {
  if (!declareAccepted.value) return
  try {
    await submitExamDeclare(arrangeId.value, true)
    declareAcceptedFlag.value = true
    declareVisible.value = false
    // 声明接口成功后重新取一次 pre-check，避免用旧的 pre 继续推进
    let pre: ExamPreCheck | null = null
    try {
      pre = await getExamPreCheck(arrangeId.value)
    } catch {
      pre = null
    }
    advance({ pre })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '声明确认失败')
  }
}

/**
 * 签名提交：dataURL → 上传拿 fileUrl → 落签名记录拿 signId。
 *
 * <p>两步分开是因为契约 §11.5 的 `imageUrl` 由前端上传到 `/exam/files/**` 得到，
 * 签名接口只接收 URL，不接收二进制。
 */
const onSignSubmit = async (dataUrl: string): Promise<boolean> => {
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], `sign-${Date.now()}.png`, { type: 'image/png' })
  const uploaded = await uploadExamFile(file)
  const imageUrl = normalizeExamFileUrl(uploaded?.fileUrl)
  if (!imageUrl) {
    toast.error('签名上传失败，请重试')
    return false
  }
  const result = await submitExamSign(arrangeId.value, imageUrl, 'pre')
  signId.value = result?.signId ?? ''
  // 拿到 signId 说明签名已绑定成功，继续推进
  let pre: ExamPreCheck | null = null
  try {
    pre = await getExamPreCheck(arrangeId.value)
  } catch {
    pre = null
  }
  advance({ pre })
  return true
}

/**
 * 人脸核验完成：无论 pass/fail/error 都继续考试（DER-07）。
 *
 * <p>⚠ **契约缺口**（已上报 captain，待后端补接口）：`04 §11` 只有
 * 入场 / 声明 / 签名 / 开始四个接口，**没有「提交核验结论与抓拍图」的接口**；
 * `§11.6 start` 的入参只有 `signId` / `declareAccepted`，后端
 * `StudentExamDtos.StartReq` 同样没有 identity 字段。
 * 因此这里只做不越界的事：把抓拍图上传到 `/exam/file/upload`
 * （`identity_evidence` 就复用这套文件存储），**不伪造任何接口**、不假报已落库。
 * 待后端补 `POST /student/exams/{arrangeId}/face-verify`（或给 start 加
 * `identityStatus` / `identityEvidence`）后，在这里多发一次即可。
 *
 * <p>上传失败**也不影响开考**：否则「能拍但存储挂了」会变成一种新的阻断路径，
 * 与 DER-07「绝不阻断」冲突。
 */
const onFaceFinish = async (result: FaceVerifyResult) => {
  // 只暂存，不在这里联网：核验弹窗在 start 之前弹出，此刻还没有 attemptId（DER-29 接口需要它）。
  // 证据图也延后上传，避免「图传到一半但 start 失败」留下孤儿文件。
  pendingIdentity = {
    status: result.outcome === 'pass' ? 1 : result.outcome === 'fail' ? 2 : 3,
    snapshot: result.snapshot ?? null,
    method: result.method ?? 1,
    similarity: result.similarity ?? null
  }
  void doStart()
}

/**
 * 把暂存的核验结果补报到答卷（必须拿到 attemptId 之后才能调）。
 *
 * <p>**任何失败都不向上抛**：DER-07 定的是核验绝不阻断考试，
 * 上报失败只意味着少一条证据，不该让学员卡在「开始考试」上。
 */
const reportIdentity = async (attemptId: string) => {
  if (!pendingIdentity) return
  const { status, snapshot, method, similarity } = pendingIdentity
  pendingIdentity = null
  let evidence: string | null = null
  if (snapshot) {
    try {
      const blob = await (await fetch(snapshot)).blob()
      const file = new File([blob], `face-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const uploaded = await uploadExamFile(file)
      // 注意：**不能**用 normalizeExamFileUrl——它是给 <img src> 显示用的，
      // 会把 `/api/exam/files/...` 去掉 `/api` 变成 `/exam/files/...`。
      // 存库必须存接口原样返回的 `/api/exam/files/...`，否则后续按 URL 取图会 404。
      evidence = uploaded?.fileUrl || null
    } catch {
      // 证据图上传失败只吞掉；状态仍要报（无图也能表明核验过）
    }
  }
  try {
    await reportFaceVerify(attemptId, {
      identityStatus: status,
      identityEvidence: evidence,
      // DER-34：把核验手段与相似度一并上报，批阅人靠它判断证据强度
      identityMethod: method,
      identityScore: similarity
    })
  } catch {
    // 静默：上报失败不影响开考（DER-07）
  }
}

/**
 * 答题页路由存在性检查。
 *
 * <p>答题页（`/exam/student/attempts/:attemptId`，契约 02 §8B.1）属另一张任务单，
 * 本单交付时可能尚未落地。若直接 push，router 会命中 404 兜底路由，
 * 学员看到的是「页面不存在」——比「还进不去」更让人困惑。
 * 因此先 resolve 一次：命中 NotFound 就停在场页并给出准确提示，
 * 等答题页接上后这里**无需改动**，自动开始跳转。
 */
const ATTEMPT_ROUTE_NAME = 'NotFound'

const hasAttemptPage = (attemptId: string): boolean => {
  const resolved = router.resolve(`/exam/student/attempts/${attemptId}`)
  return resolved.name !== ATTEMPT_ROUTE_NAME
}

/** 真正开考：带上前置步骤的凭据，成功后进答题页 */
const doStart = async () => {
  if (starting.value) return
  starting.value = true
  try {
    const result = await startExam(arrangeId.value, {
      signId: signId.value || undefined,
      declareAccepted: declareAcceptedFlag.value ? true : undefined
    })
    // 答卷已创建，此刻才能把核验结果写到这份答卷上
    await reportIdentity(result.attemptId)
    if (!hasAttemptPage(result.attemptId)) {
      // 答卷已经创建成功（后端已开考、已计次），只是前端答题页还没上线。
      // 如实告知而不是假装跳转失败，学员刷新后可从列表继续。
      toast.warn('考试已开始，但答题页尚未上线，请稍后从「我的考试」进入')
      return
    }
    await router.push(`/exam/student/attempts/${result.attemptId}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '开始考试失败')
  } finally {
    starting.value = false
  }
}

/**
 * 「查看详情」→ **考试结果页**（2026-11-13 按原平台修正）。
 *
 * <p>原平台概览页的「考试结果 / 查看详情」跳的是**结果页**，
 * 在结果页里再点「查看答题详情」才看卷子。原先我方直接跳 `/paper`（答卷），
 * 跳过结果页，学员就看不到分数与正确率分析，链路与原平台不符。
 */
const goDetail = () => {
  const attemptId = entry.value?.lastResult?.attemptId
  if (!attemptId) return
  router.push(`/exam/student/attempts/${attemptId}/result`)
}

onMounted(load)

/**
 * 拉一次基准照，供人脸核验做比对（DER-34）。
 *
 * <p>**失败静默当未录入**：比对是增强项，不能因为它挂了而挡住核验或入场。
 * 未录入时 `baselineUrl` 为 null，核验走纯活体路径，不会加载额外的 6.7MB 模型。
 */
onMounted(async () => {
  try {
    const state = await getFaceBaseline()
    baselineUrl.value = state?.hasBaseline ? state.imageUrl : null
  } catch {
    baselineUrl.value = null
  }
})
</script>

<style scoped lang="scss">
/*
 * 尺寸全部来自对 `原平台-入场页-已考过.png` 的逐像素实测（该图 1:1 CSS px）：
 * 底灰、卡片 x343..1542（宽 1200）、内容左边界 x443（内边距 100）、
 * 网格 1000×250、行距 58、结果条高 88、主按钮 112×40。
 * 颜色 2026-11-14 改走 Cobalt token（Hallmark 重构，#436bff 系弃用）。
 */
.exam-entry-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 56px;
}

.entry-crumb {
  margin-bottom: 24px;
  font-size: 14px;
}

/* 面包屑：非当前项 muted、当前项 ink（实测结构保留） */
:deep(.el-breadcrumb__inner) {
  color: var(--color-muted);
  font-weight: 400;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--color-ink);
}

.entry-card {
  padding: 40px 100px 56px;
  background: var(--color-paper);
  border-radius: var(--radius-card);
}

.entry-alert {
  padding: 24px;
}

/* 标题 20px（实测 ink 高 23 → 20px 字号）、居中 */
.entry-title {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 500;
  font-family: var(--font-display);
  color: var(--color-ink);
  text-align: center;
}

/* 入场时间行：14px / 次要灰 / 居中共（实测 ink y232..246，距标题盒底 16） */
.entry-time {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink-2);
  text-align: center;
}

/* 网格：2 列 + 中线。用伪元素画中线，避免 1px 边框在 2 列下重复叠加成 2px。
   高度自洽校验：padding 21 + 34×4 + gap 24×3 + padding 21 = 250，与实测 250 一致 */
.info-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* 行距 58 = 行盒 34 + gap 24 */
  gap: 24px 0;
  margin-top: 28px;
  padding: 21px 0;
  background: var(--color-paper-2);
  border-radius: 4px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: var(--color-rule);
  }
}

.info-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding-left: 70px;
  font-size: 14px;
  line-height: 22px;
}

/* 第二列内缩 87（实测图标 x1030 - 网格左 443 = 587，即 500 + 87） */
.info-cell:nth-child(even) {
  padding-left: 87px;
}

/* 图标 20×20、muted，与标签同高不抢视线 */
.info-icon {
  display: inline-flex;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--color-muted);
}

/* 标签灰、值深，且标签不设固定宽度（实测两列各自紧排，不做对齐） */
.info-label {
  color: var(--color-muted);
  white-space: nowrap;

  &::after {
    content: '：';
  }
}

.info-value {
  color: var(--color-ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
 * 小标题 14px / ink。
 *
 * 上下间距由实测 ink 位置反推（14px 字在 22px 行盒里上下各留 ~3.5px 空白）：
 * 网格底 528 →「考试结果」ink 554 ⇒ 间距 ~22；结果条底 669 →「答卷须知」ink 695 ⇒ 同样是 22。
 * 标题盒底到下一块的间距两处实测略有差异（结果条 10 / 须知正文 3），
 * 取 8 作折中，两处偏差都 ≤5px——截图只能看到 ink，看不到行盒，再细就是猜测了。
 */
.section-title {
  margin: 22px 0 8px;
  font-size: 14px;
  line-height: 22px;
  font-weight: 400;
  color: var(--color-ink);
}

/* 结果条：高 88、warning 浅底、圆角 4，左右内边距 24 */
.result-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 88px;
  padding: 16px 24px;
  background: color-mix(in oklab, var(--color-error) 6%, var(--color-paper));
  border-radius: 4px;

  /* 已通过走 success 系（原平台仅实测到未通过态，通过态按同结构推导） */
  &.is-passed {
    background: color-mix(in oklab, var(--color-success) 10%, var(--color-paper));
  }
}

.result-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

/* 图标 error（未通过）/ success（通过） */
.result-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  color: var(--color-error);

  .is-passed & {
    color: var(--color-success);
  }
}

.result-text {
  min-width: 0;
}

.result-status {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
}

.result-his {
  margin-top: 4px;
  font-size: 14px;
  line-height: 22px;
}

.his-label {
  color: var(--color-muted);
  margin-right: 6px;
}

.his-value {
  color: var(--color-ink);
}

/* 查看详情按钮：实测 96×32；描边态由主题层提供 */
.result-detail-btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 16px;
}

.result-detail-disabled {
  display: inline-flex;
}

/* 须知正文：14px / 次要灰 / 行高 26（实测两行 y720..737、y747..759） */
.notice-text {
  margin: 0;
  font-size: 14px;
  line-height: 26px;
  color: var(--color-ink-2);
}

/* 正文里嵌的「标记」小图标，与文字基线对齐 */
.notice-mark {
  display: inline-flex;
  align-items: center;
  vertical-align: -2px;
  margin: 0 2px;
  color: var(--color-ink-2);
}

.block-reason {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-warning);
}

/* 主按钮 112×40，键帽化与 hover 提亮由主题层承担 */
.entry-actions {
  margin-top: 44px;
  text-align: center;
}

.start-btn {
  width: 112px;
  height: 40px;
  font-size: 14px;
}

.declare-text {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 24px;
  color: var(--color-ink-2);
}
</style>
