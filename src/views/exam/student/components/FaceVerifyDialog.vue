<template>
  <el-dialog
    v-model="visible"
    title="身份核验"
    width="480px"
    class="face-verify-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    align-center
    @closed="teardown"
  >
    <!-- ===== 状态 A：摄像头预览 / 动作挑战 / 抓拍 ===== -->
    <template
      v-if="
        phase === 'ready' || phase === 'requesting' || phase === 'checking' || phase === 'challenge'
      "
    >
      <div class="camera-box">
        <!--
          muted + playsinline 必须都有：缺 muted 多数浏览器禁止自动播放，
          缺 playsinline 在 iOS 上会强制全屏播放，弹窗布局被撑破。
        -->
        <video
          ref="videoRef"
          class="camera-video"
          autoplay
          playsinline
          muted
          aria-label="摄像头预览"
        ></video>
        <div v-if="phase === 'requesting'" class="camera-mask">正在打开摄像头…</div>
        <div v-else-if="phase === 'checking'" class="camera-mask">正在准备人脸模型…</div>
        <!--
          挑战提示条压在画面底部而不是盖住整块视频：学员要能看见自己的脸，
          才知道「我有没有转过头」；全遮罩会让他靠猜，只能超时。
        -->
        <div v-if="phase === 'challenge'" class="challenge-bar">
          <p class="challenge-prompt" role="status" aria-live="polite">{{ promptText }}</p>
          <p class="challenge-countdown">请在 {{ secondsLeft }} 秒内完成</p>
        </div>
      </div>

      <p class="face-tip">
        {{
          phase === 'challenge'
            ? '请按屏幕提示完成动作，完成后自动进入考试'
            : '请正对摄像头，保持面部清晰可见'
        }}
      </p>
      <p class="face-note">
        <span aria-hidden="true">ⓘ</span>
        若核验未通过，本次考试仍可继续，但会被标记为「待人工核对」。
      </p>
    </template>

    <!-- ===== 状态 B：无法使用摄像头 / 无法执行活体（DER-07：只提示，不阻断） ===== -->
    <template v-else-if="phase === 'unavailable'">
      <div class="result-block">
        <div class="result-icon is-warn" aria-hidden="true">!</div>
        <p class="result-title">无法完成人脸核验</p>
        <p class="result-desc">
          你仍可以继续考试，但本次会被标记为「待人工核对」，建议先检查浏览器权限或设备。
        </p>
        <p v-if="unavailableReason" class="result-reason">原因：{{ unavailableReason }}</p>
      </div>
    </template>

    <!-- ===== 状态 C：核验未通过（DER-07：只记录，不阻断） ===== -->
    <template v-else-if="phase === 'fail'">
      <div class="result-block">
        <div class="result-icon is-fail" aria-hidden="true">✕</div>
        <p class="result-title">身份核验未通过</p>
        <p class="result-desc">
          本次考试仍可继续，但会被标记为「待人工核对」，批阅时需要你配合确认身份。
        </p>
        <!-- 动作挑战失败的具体原因（超时 / 没人脸 / 多人脸），文案由状态机给出 -->
        <p v-if="failureText" class="result-reason">{{ failureText }}</p>
        <p v-if="retryLeft <= 0" class="result-reason">
          已达到重试上限（{{ MAX_FACE_RETRY }} 次），将以「核验未通过」记录并继续考试。
        </p>
        <p v-else class="result-reason">还可以再试 {{ retryLeft }} 次。</p>
      </div>
    </template>

    <!-- ===== 状态 D：核验通过 ===== -->
    <template v-else-if="phase === 'pass'">
      <div class="result-block">
        <div class="result-icon is-pass" aria-hidden="true">✓</div>
        <p class="result-title">{{ passTitle }}</p>
        <p class="result-desc">正在进入考试…</p>
      </div>
    </template>

    <template #footer>
      <div class="face-footer">
        <!-- 任何状态都必须有一个「继续」出口：DER-07 要求核验绝不阻断考试 -->
        <template v-if="phase === 'fail'">
          <el-button v-if="retryLeft > 0" :loading="busy" @click="startCapture">
            再试一次
          </el-button>
          <el-button type="primary" :loading="busy" @click="continueWith('fail')">
            继续考试
          </el-button>
        </template>

        <template v-else-if="phase === 'unavailable'">
          <el-button :loading="busy" @click="startCapture">重新检测</el-button>
          <el-button type="primary" :loading="busy" @click="continueWith('error', null)">
            继续考试
          </el-button>
        </template>

        <!--
          挑战进行中也要留出口：机位/光线异常时学员不能只能干等 15 秒。
          「跳过核验」记 error（identity_status=3），与「无法核验」同口径，
          不会因为跳过就变成通过。
        -->
        <template v-else-if="phase === 'challenge'">
          <el-button :loading="busy" @click="continueWithoutVerify">跳过核验</el-button>
        </template>

        <!--
          加载摄像头 / 2MB 人脸模型期间：既要告诉学员「还在跑」，也要给出口。
          只放一个 disabled 的「请稍候」是不够的——模型下载卡住时那就是死锁。
        -->
        <template v-else-if="phase === 'checking' || phase === 'requesting'">
          <el-button disabled>请稍候…</el-button>
          <el-button @click="continueWithoutVerify">跳过核验</el-button>
        </template>

        <template v-else-if="phase === 'pass'">
          <el-button type="primary" :loading="busy" @click="continueWith('pass')">
            进入考试
          </el-button>
        </template>

        <template v-else>
          <el-button :loading="busy" @click="continueWithoutVerify">跳过核验</el-button>
          <el-button type="primary" :loading="busy" @click="startCapture">开始核验</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 人脸核验弹窗（契约 01 §S3 / 02 §8B.4，决策 DER-07）。
 *
 * <p>★★ 本组件的**唯一硬约束**：任何失败路径都必须能让学员继续考试。
 * 核验是「证据采集」不是「准入闸门」——我们无法可靠区分「摄像头故障」与
 * 「故意遮挡/替考」，做成硬闸门必然误伤正常学员（DER-07）。
 * 具体表现：
 * - 用户拒绝授权 / 没有摄像头 / 设备被占用 → 提示后仍可继续（记 error，即 `identity_status=3`）
 * - 动作挑战未完成（超时 / 没人脸 / 多人脸）→ 可重试，最多 3 次；超限按 fail 记录并放行
 * - 人脸模型加载失败 / 动态 chunk 拉不下来 → 记 error 并放行
 * - 检测循环报错、抓帧失败、任何未预期异常 → 一律降级成「无法核验」并放行
 * - 挑战进行中 / 模型加载中都有显式「跳过核验」出口
 * - 主动「跳过核验」同样放行（记 error）
 *
 * <p>因此本组件**不提供关闭按钮**（`show-close=false`、不可点遮罩/ESC 关闭），
 * 否则学员会去找那个叉而绕过整个流程；所有出口都显式落在底部按钮上，
 * 且每个出口都通向「继续考试」。
 *
 * <h3>动作式活体（本版新增）</h3>
 * 原实现是「抓到画面即 pass」，等于只要有摄像头就算通过——照片怼镜头也能过。
 * 现在插入 `challenge` 阶段：随机抽一个动作（眨眼 / 转头），每
 * {@link DETECT_INTERVAL_MS} 一拍调 `detectOnce(video)` 取一帧检测结果，
 * 喂给 `livenessChallenge` 状态机，动作达成才抓拍并记 `identity_status=1`。
 *
 * <p>分工是刻意的：采集在 `faceLiveness`（依赖 TFJS + 2MB 模型，只能集成测）、
 * 判定在 `livenessChallenge`（纯函数，配了完整单测）、本组件只做**编排与展示**。
 * 所以这里不写任何阈值——阈值只存在于状态机里，改一处就是改全部。
 *
 * <h3>为什么 faceLiveness 必须动态 import</h3>
 * human 打包后约 1.9MB。静态 import 会让主 chunk 背上它，连不考试的页面都白等。
 * 这里用 `await import('../faceLiveness')`，Vite 会切成独立 chunk，
 * 只有真的点「开始核验」才下载。类型用 `import type` 引入——纯类型在编译期擦除，
 * 不会把运行时依赖带回来。
 *
 * <h3>时钟</h3>
 * 挑战的 `now` 一律取 `performance.now()`（单调时钟，不受系统改时间影响）。
 * ★ `createChallenge` 与 `feedSample`/`checkTimeout` 必须用**同一个量纲**：
 * 混进一次 `Date.now()`（epoch 毫秒）会让 `deadlineAt` 瞬间失效，
 * 表现是「刚打开就超时」。
 *
 * <p>判定口径（结论 → identity_status、重试上限、错误文案）全在
 * `faceVerifyModel.ts`，那里配了单测；本组件只负责采集与展示。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  MAX_FACE_RETRY,
  NO_CAMERA_API_REASON,
  describeCameraError,
  hasCameraApi,
  retryLeftOf,
  type FaceVerifyOutcome,
  type FaceVerifyResult,
} from '../faceVerifyModel'
import {
  challengePrompt,
  checkTimeout,
  createChallenge,
  failureMessage,
  feedSample,
  isSatisfied,
  isTerminal,
  type ChallengeState,
  type LivenessSample,
} from '../livenessChallenge'
// ★ 只引类型：`import type` 编译后整行消失，不会把 1.9MB 的 human 拖进主 chunk
import type { LivenessFrame } from '../faceLiveness'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 比对成功后弹窗停留时间（ms），让学员看清「通过」再进考场 */
    passDelayMs?: number
    /**
     * 比对实现（可选）。
     *
     * <p>后端 CompreFace 比对服务本期未接入，契约 04 §11 也没有「提交核验结论」的接口，
     * 所以不传时按「拿到有效抓拍即采集成功」处理。接后端时把 `verify` 传进来即可：
     * 拿到 `fail` 走「再试一次 / 继续考试」分支，`pass` 走通过分支。
     *
     * <p>注意 `verify` 现在只决定「动作挑战通过之后」的结论，不再决定能否开始核验：
     * 活体动作是**本地**判定的，与远端比对无关。
     */
    verify?: (snapshot: string) => Promise<FaceVerifyOutcome>
    /**
     * 学员已有的人脸基准照 URL（2026-11-13，DER-34）。
     *
     * <p>**不传或传空 = 不做比对**，走纯活体路径（不加载额外的 6.7MB 特征模型）。
     * 传了才在当前帧算特征向量并与基准比，把相似度随结果带出去。
     *
     * <p>**比对不通过也不阻断**：与活体同一口径（DER-07），
     * 只是把相似度报给后端，让批阅人看到证据强度。
     */
    baselineUrl?: string | null
  }>(),
  // 注意：函数类型 prop 不能用 default 给默认实现——Vue 对 Function 类型默认值
  // 是「直接用」还是「当工厂调用」在编译产物里不同版本不一致。这里留空，
  // 由下面的 runVerify 显式兜底，行为确定。
  { passDelayMs: 600 },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 学员完成/放弃核验，外层据此上传证据并开始考试 */
  finish: [result: FaceVerifyResult]
}>()

/**
 * 阶段。
 *
 * <p>`challenge` 是本版新增的「动作挑战进行中」：与 `checking`（在等摄像头/模型）
 * 分开，是因为前者有明确的动作指令与倒计时，后者只有「请稍候」。
 * 混成一个状态会让模板里到处出现 `phase === 'checking' && challengeState` 的
 * 二段判断，读起来比多一个枚举值糟得多。
 */
type Phase =
  'idle' | 'requesting' | 'ready' | 'checking' | 'challenge' | 'pass' | 'fail' | 'unavailable'

/**
 * 检测节拍（ms）。
 *
 * <p>250ms ≈ 4fps。取这个值而不是 `requestAnimationFrame`（60fps）：
 * human 全模型（blazeface + facemesh）单帧推理约 100~200ms，跑满 60fps 只会
 * 把 CPU 打满、画面掉帧，判定精度并不会提高——眨眼闭眼阶段持续 100~400ms，
 * 4fps 恰好能抓到 1~2 帧。状态机的 `BLINK_CLOSED_FRAMES=1` 也是按这个节拍定的。
 */
const DETECT_INTERVAL_MS = 30

const videoRef = ref<HTMLVideoElement | null>(null)
const phase = ref<Phase>('idle')
const busy = ref(false)
const snapshotUrl = ref<string | null>(null)
const unavailableReason = ref('')
/** 已重试次数（不含首次） */
const retried = ref(0)
/** 当前动作挑战状态；null = 不在挑战中 */
const challengeState = ref<ChallengeState | null>(null)
/** 最近一次检测时刻（`performance.now()`），用于渲染倒计时 */
const clockNow = ref(0)

let stream: MediaStream | null = null
/**
 * 是否已放行过。
 *
 * <p>`pass` 之后弹窗会停留 `passDelayMs` 再放行，这段时间底部还留着「进入考试」按钮；
 * 不加这道闸，学员点一下就会触发第二次 `finish`，外层会重复调 start 接口。
 */
let finished = false

/** faceLiveness 模块句柄（动态 import 的缓存；加载失败时为 null，下次重试） */
let livenessModule: typeof import('../faceLiveness') | null = null
/** 检测循环的 interval 句柄；null = 没在跑 */
let detectTimer: ReturnType<typeof setInterval> | null = null
/** 上一拍还没算完？true 时跳过本拍，避免 detectOnce 调用堆积 */
let detectBusy = false
/**
 * 运行代次（generation token）。
 *
 * <p>检测是异步的：`await detectOnce()` 期间学员可能已经关掉弹窗。回调恢复时
 * 若不做代次校验，就会对着已销毁的 DOM 改状态、甚至再起一条循环（interval 泄漏）。
 * 每次「作废本轮」（关闭 / 卸载 / 重新开始）都 `runToken += 1`，
 * 所有异步续点都比对一次，不对就直接 return。
 */
let runToken = 0
/**
 * 本轮挑战里**有效**样本帧数（不含 `frame.error` 的帧）。
 *
 * <p>只用来区分两种「超时」：全程一帧有效画面都没拿到 → 是**检测不可用**
 * （记 error=3，不冤枉人）；拿到过有效画面但动作没做出来 → 才是 fail=2。
 */
let validSamples = 0

const retryLeft = computed(() => retryLeftOf(retried.value))

/** 当前挑战的指令文案（随眨眼/转头、左/右变化） */
const promptText = computed(() =>
  challengeState.value ? challengePrompt(challengeState.value) : '',
)

/** 挑战失败原因文案；进行中/通过时为空串 */
const failureText = computed(() =>
  challengeState.value ? failureMessage(challengeState.value) : '',
)

/** 倒计时秒数（向上取整，不为负） */
const secondsLeft = computed(() => {
  const state = challengeState.value
  if (!state) return 0
  return Math.max(0, Math.ceil((state.deadlineAt - clockNow.value) / 1000))
})

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

/** 停流：不 stop 的话摄像头指示灯一直亮，学员会以为被偷拍 */
function stopStream() {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  const video = videoRef.value
  if (video) {
    video.srcObject = null
  }
}

/** 停检测循环。可重复调用（幂等） */
function stopDetectLoop() {
  if (detectTimer !== null) {
    clearInterval(detectTimer)
    detectTimer = null
  }
  detectBusy = false
}

/**
 * 作废当前这一轮：递增代次 + 停循环。
 *
 * <p>只停 interval 是不够的——已发出的 `detectOnce` 还在飞，代次是唯一能拦住
 * 「回来的旧回调把新状态写坏」的手段。
 */
function invalidateRun() {
  runToken += 1
  stopDetectLoop()
}

/** 关闭/卸载时的统一清理 */
function teardown() {
  invalidateRun()
  stopStream()
  snapshotUrl.value = null
  challengeState.value = null
  clockNow.value = 0
  validSamples = 0
  phase.value = 'idle'
  retried.value = 0
  unavailableReason.value = ''
  busy.value = false
  finished = false
}

/**
 * 打开摄像头。
 *
 * <p>先判 `hasCameraApi` 再调 `getUserMedia`：内网 http 访问时它不存在，
 * 直接调会抛 TypeError，而错误文案会误导学员以为设备坏了。
 */
async function openCamera() {
  unavailableReason.value = ''
  snapshotUrl.value = null

  if (!hasCameraApi()) {
    phase.value = 'unavailable'
    unavailableReason.value = NO_CAMERA_API_REASON
    return
  }

  phase.value = 'requesting'
  try {
    stopStream()
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
      audio: false,
    })
    await nextTick()
    const video = videoRef.value
    if (!video) {
      phase.value = 'unavailable'
      unavailableReason.value = '页面初始化异常，请刷新后重试'
      return
    }
    video.srcObject = stream
    // play() 在部分浏览器返回 rejected Promise（自动播放策略），吞掉即可，画面仍会出
    await video.play().catch(() => undefined)
    phase.value = 'ready'
  } catch (e) {
    // NotAllowedError（拒绝授权）/ NotFoundError（无设备）/ NotReadableError（被占用）都走这里
    phase.value = 'unavailable'
    unavailableReason.value = describeCameraError(e)
  }
}

/** 从 video 抓一帧到 canvas，返回 dataURL；失败返回 null（不抛） */
function grabFrame(): string | null {
  const video = videoRef.value
  if (!video || !video.videoWidth || !video.videoHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    // 跨域污染画布时 toDataURL 抛 SecurityError
    return null
  }
}

/**
 * 执行比对。
 *
 * <p>未注入 `verify` 时的默认行为：动作挑战已通过 + 抓到了画面 → `pass`。
 * 抛错一律降级成 `error`（无法核验），绝不把学员卡在弹窗里。
 */
async function runVerify(snapshot: string): Promise<FaceVerifyOutcome> {
  if (!props.verify) return 'pass'
  try {
    return await props.verify(snapshot)
  } catch {
    return 'error'
  }
}

/**
 * 确保摄像头处于出流状态，供抓帧使用。
 *
 * <p>为什么需要它：核验失败后 `stopStream()` 会释放摄像头，此时 `video` 已经没画面了。
 * 学员点「再试一次」若直接 `grabFrame`，拿到的是一张死图（videoWidth=0）——
 * 表现出来就是「重试永远抓拍失败」，与「能重试 3 次」的承诺不符。
 * 所以每次抓帧前先确认流还在，不在就重新开一次。
 */
async function ensureCamera(): Promise<boolean> {
  if (stream && videoRef.value?.srcObject && (videoRef.value?.videoWidth ?? 0) > 0) {
    return true
  }
  await openCamera()
  return phase.value === 'ready'
}

/**
 * 按需加载检测模块（动态 import，Vite 切成独立 chunk）。
 *
 * <p>失败时不缓存：`livenessModule` 保持 null，下次点「重新检测」会重新拉一次。
 * 若缓存了 rejected 的 Promise，一次网络抖动就会让本页面永久失效。
 */
async function loadLiveness(): Promise<typeof import('../faceLiveness')> {
  if (!livenessModule) {
    livenessModule = await import('../faceLiveness')
  }
  return livenessModule
}

/** 把模型加载异常译成学员能看懂的原因；绝不返回空串 */
function describeLivenessError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  return message || '人脸模型加载失败，请检查网络后重试'
}

/**
 * 真机标定用的诊断开关。
 *
 * <p>**为什么需要它**：`BLINK_OPEN_ENTER = 0.35` 这个睁眼上界架在单点实测（human 内置 warmup
 * 样例人脸、正对、光照好）上，不是考场 webcam。真机 `openLeft` 常态若低于 0.35，
 * `eyesArmed` 永远不成立 → 眨眼挑战必然超时（诚实学员被判失败）。
 * 现场只需在控制台执行 `localStorage.setItem('face-verify-debug','1')` 后重进页面，
 * 就能看到每帧的真实 `openLeft`，据此决定要不要下调该常量。
 *
 * <p>默认**关闭**：正常学员的控制台不应被这些噪音刷屏，也不该暴露内部阈值。
 */
const debugEnabled = (): boolean => {
  try {
    return localStorage.getItem('face-verify-debug') === '1'
  } catch {
    return false
  }
}

/** 检测帧 → 状态机样本。字段名/单位与 `LivenessSample` 一一对应（弧度、睁眼度、越小越闭） */
function toSample(frame: LivenessFrame): LivenessSample {
  if (debugEnabled()) {
    // 只打关键量：openLeft 决定眨眼能否通过，yaw 决定转头能否通过
    console.log(
      '[face-verify]',
      'faceCount=' + frame.faceCount,
      'openL=' + (Number.isFinite(frame.openLeft) ? frame.openLeft.toFixed(3) : 'NaN'),
      'openR=' + (Number.isFinite(frame.openRight) ? frame.openRight.toFixed(3) : 'NaN'),
      'yaw=' + (Number.isFinite(frame.yaw) ? frame.yaw.toFixed(3) : 'NaN'),
      'err=' + (frame.error ?? '-')
    )
  }
  return {
    faceCount: frame.faceCount,
    yaw: frame.yaw,
    roll: frame.roll,
    openLeft: frame.openLeft,
    openRight: frame.openRight,
    blinkGesture: frame.blinkGesture,
  }
}

/**
 * 应用新的挑战状态；若是终态则收尾。
 *
 * <p>收尾分三种，必须严格区分（DER-07 的公平性在这里）：
 * - `satisfied` → 抓拍 → 走比对 → `identity_status=1`
 * - `timeout` 且**全程没有一帧有效画面** → 这是检测不可用，记 error(3)，不冤枉人
 * - 其余（timeout/没脸/多人脸，但确实看见了画面） → fail(2)，仍可继续
 */
function applyChallenge(next: ChallengeState, token: number) {
  if (token !== runToken) return
  challengeState.value = next
  if (!isTerminal(next)) return
  // 终态立刻停循环：多喂一帧没有意义，还会让已结束的挑战继续占用 CPU
  stopDetectLoop()

  if (isSatisfied(next)) {
    void captureAndVerify(token)
    return
  }

  if (next.status === 'timeout' && validSamples === 0) {
    // 15 秒里一帧有效样本都没有：模型/摄像头/网络坏了，不是学员没做动作。
    // 记 fail 会把设备故障算在学员头上，所以降级成 error（identity_status=3）。
    phase.value = 'unavailable'
    unavailableReason.value = '人脸检测不可用：长时间未能取得有效画面，请检查摄像头或网络后重试'
    stopStream()
    return
  }

  phase.value = 'fail'
  stopStream()
}

/**
 * 挑战到达终态前的一拍：只推进时钟，不伪造样本。
 *
 * <p>`detectOnce` 声明永不抛异常，这里兜的是「动态 chunk 加载失败」这类意外；
 * 也可能是我们主动跳过的 error 帧。两者都不该判失败——让 `checkTimeout` 兜底。
 */
function advanceTimeout(token: number) {
  const state = challengeState.value
  if (!state || token !== runToken) return
  const now = performance.now()
  clockNow.value = now
  applyChallenge(checkTimeout(state, now), token)
}

/**
 * 处理一帧检测结果。
 *
 * <p>★ `frame.error` 有值意味着这一帧**没有样本**（`emptyFrame`：`faceCount=0`、
 * `openLeft=NaN`）。绝不能喂给状态机：`faceCount=0` 会被立即判 `no-face`，
 * 一次模型抖动 / 视频尚未就绪就把诚实学员记成「作弊嫌疑」。
 * 所以只推进时钟，交给 15 秒超时兜底。
 */
function handleFrame(frame: LivenessFrame, token: number) {
  const state = challengeState.value
  if (!state || token !== runToken) return
  const now = performance.now()
  clockNow.value = now

  if (frame.error) {
    applyChallenge(checkTimeout(state, now), token)
    return
  }

  validSamples += 1
  const sample = toSample(frame)
  const next = feedSample(state, sample, now)
  // 诊断追踪：挂到 `window.__faceTrace` 而不是只打 console——
  // 现场没有开发者工具时 console.log 等于不存在，挂 window 才能被外部工具读走。
  // 仅在开启调试时记录，避免正常考试时白占内存。
  if (window.localStorage?.getItem('face-verify-debug') === '1') {
    const w = window as unknown as { __faceTrace?: unknown[] }
    const trace = w.__faceTrace ?? []
    trace.push({
      t: Math.round(now),
      open: typeof sample.openLeft === 'number' ? +sample.openLeft.toFixed(3) : null,
      openR: typeof sample.openRight === 'number' ? +sample.openRight.toFixed(3) : null,
      faces: sample.faceCount,
      armed: (next as { eyesArmed?: boolean }).eyesArmed,
      sawClosed: (next as { sawClosed?: boolean }).sawClosed,
      status: next.status
    })
    if (trace.length > 400) trace.shift()
    w.__faceTrace = trace
  }
  applyChallenge(next, token)
}

/** 一拍检测。串行化由 `detectBusy` + `detectOnce` 内部的队列双重保证 */
async function tick(token: number) {
  if (token !== runToken) return
  // 上一拍还没算完就跳过本拍：不跳过会越积越多，画面越卡、延迟越大
  if (detectBusy) return
  const state = challengeState.value
  if (!state || phase.value !== 'challenge' || isTerminal(state)) return

  detectBusy = true
  try {
    const liveness = await loadLiveness()
    if (token !== runToken) return
    const frame = await liveness.detectOnce(videoRef.value)
    // 期间可能已关闭/卸载/重新开始：丢弃这一帧，绝不再改状态
    if (token !== runToken) return
    handleFrame(frame, token)
  } catch {
    if (token === runToken) advanceTimeout(token)
  } finally {
    // 只在还是本轮时才清标记：否则会误清下一轮刚设上的「正在检测」
    if (token === runToken) detectBusy = false
  }
}

function startDetectLoop(token: number) {
  stopDetectLoop()
  clockNow.value = performance.now()
  detectTimer = setInterval(() => {
    void tick(token)
  }, DETECT_INTERVAL_MS)
}

/**
 * 比对结果（DER-34）。`null` 表示未做比对。
 *
 * <p>不论比对是否相似都保留：批阅人需要看到「差多少」才能分清
 * 是光线/角度导致的不像，还是真换了人。
 */
const compareOutcome = ref<{
  similarity: number | null
  compared: boolean
  /** true 同一人 / false 不是同一人 / null 未比对 */
  matched: boolean | null
} | null>(null)

/**
 * 通过文案（台账 7cbc）：必须告诉学员「这次到底核验了什么」。
 *
 * <p>没录基准照、模型加载失败、基准图 404 时 `runCompare` 会静默当成未比对，
 * 只让 `identity_method` 记 1。这时只写「身份核验通过」会让人误以为已经比过照片，
 * 属于静默降级——把条件写进文案里，学员才能知道证据强度不够。
 */
const passTitle = computed(() =>
  compareOutcome.value?.compared
    ? '身份核验通过'
    : '身份核验通过（仅活体检测，未做照片比对）'
)

/**
 * 执行基准照比对（DER-34）。
 *
 * <p>**失败一律不抛、不阻断**：没录基准照、模型加载失败、基准图 404、
 * 算不出特征向量——全部静默当成「未比对」，只让 `identity_method` 记 1。
 * 核验本身都不阻断考试（DER-07），比对更不能变成新的阻断点。
 */
async function runCompare(token: number) {
  compareOutcome.value = null
  if (!props.baselineUrl) return
  try {
    // 先拿当前帧的向量（需 embedding 模型），再跟基准图比
    const liveness = await import('../faceLiveness')
    const probe = await liveness.detectOnce(videoRef.value, { withEmbedding: true })
    if (token !== runToken) return
    const { compareWithBaseline } = await import('../faceCompare')
    const outcome = await compareWithBaseline(probe?.embedding ?? null, props.baselineUrl)
    if (token !== runToken) return
    // matched 必须带上：下游靠它决定 identity_status 是 1 还是 2
    compareOutcome.value = {
      similarity: outcome.similarity,
      compared: outcome.compared,
      matched: outcome.matched
    }
  } catch {
    // 静默：比对失败不影响核验结论
    compareOutcome.value = null
  }
}

/**
 * 动作达成 → 抓拍 → 比对 → 定论。
 *
 * <p>与「旧版直接抓拍」的差别只有入口：现在必须先过了动作挑战，
 * 之后的抓拍/比对/放行链路完全一致，所以 `verify` 注入点的语义没有变。
 */async function captureAndVerify(token: number) {
  busy.value = true
  try {
    const frame = grabFrame()
    if (!frame) {
      phase.value = 'unavailable'
      unavailableReason.value = '已完成动作，但抓拍失败，未能取得画面'
      stopStream()
      return
    }
    snapshotUrl.value = frame
    // 比对（DER-34）：只有学员录过基准照才做——该模型 6.7MB，不该让没录入的人白下载。
    // 换算不出来、基准图加载失败、维度不一致——一律记「未比对」，绝不阻断。
    await runCompare(token)
    if (token !== runToken) return
    const liveOutcome = await runVerify(frame)
    if (token !== runToken) return
    // ★ 比对结果必须参与结论（2026-11-13 修）：
    // 此前只把相似度存进 compareOutcome，没有任何代码用它影响 outcome，
    // 结果是相似度 0.10 也照样记 identity_status=1 —— 比对形同虚设。
    // 规则：活体通过 且（未做比对 或 比对判定为同一人）才算 pass。
    // 比对判否 → fail（identity_status=2，进人工核对），但**仍可继续考试**（DER-07）。
    const cmp = compareOutcome.value
    const compareRejected = cmp?.compared === true && cmp.matched === false
    const outcome: FaceVerifyOutcome = compareRejected ? 'fail' : liveOutcome
    if (token !== runToken) return
    if (outcome === 'pass') {
      phase.value = 'pass'
      // 通过后立刻停流释放摄像头，别等到弹窗关闭
      stopStream()
      await new Promise((resolve) => setTimeout(resolve, props.passDelayMs))
      // 停留期间学员可能已手动离开：这里再校验一次，避免对已关闭的弹窗 emit
      if (token !== runToken) return
      continueWith('pass')
      return
    }
    if (outcome === 'fail') {
      // 停在失败态：学员自己决定「再试一次」还是「继续考试」——
      // 不自动放行，让他知道这次记的是「未通过」而不是「无法核验」
      phase.value = 'fail'
      stopStream()
      return
    }
    phase.value = 'unavailable'
    unavailableReason.value = '核验服务暂时不可用'
    stopStream()
  } catch {
    // 任何未预期异常都降级成「无法核验」并放行，绝不把学员卡在弹窗里
    phase.value = 'unavailable'
    unavailableReason.value = '核验过程发生异常'
    stopStream()
  } finally {
    busy.value = false
  }
}

/**
 * 开始一轮核验：确保出流 → 加载模型 → 起挑战 → 起检测循环。
 *
 * <p>每一步都要在 `await` 之后校验代次：模型 2MB，加载几秒很正常，
 * 这期间学员完全可能关掉弹窗或点「跳过核验」。
 */
async function startCapture() {
  if (busy.value || finished) return
  if (phase.value === 'fail') {
    retried.value += 1
  }
  // 作废上一轮（可能还有在飞的检测 / 残留的 interval）
  invalidateRun()
  const token = runToken
  busy.value = true
  phase.value = 'checking'
  validSamples = 0
  challengeState.value = null
  try {
    // 失败后重试时流已被释放，先重新取流；取不到就按「无法核验」放行
    const ready = await ensureCamera()
    if (token !== runToken) return
    if (!ready) {
      // openCamera 已把 phase/原因设好（unavailable），这里不再覆盖。
      // 注意：不能写成 `if (phase.value !== 'unavailable')`——上面刚赋过 'checking'，
      // TS 会把类型收窄到 'checking' 并判定比较恒真，因此用 includes 绕过收窄。
      if (!(['unavailable'] as Phase[]).includes(phase.value)) {
        phase.value = 'unavailable'
        unavailableReason.value = '无法重新打开摄像头'
      }
      return
    }
    // ensureCamera 成功后 phase 会停在 'ready'，这里改回 loading 文案：
    // 否则模型加载的几秒里界面看起来「什么都没发生」，学员会以为卡死
    phase.value = 'checking'
    // 等一帧，新开的流才有画面可抓（也就不会第一拍就 no-face）
    await new Promise((resolve) => setTimeout(resolve, 80))
    if (token !== runToken) return

    const liveness = await loadLiveness()
    if (token !== runToken) return
    // ★ 必须显式 await：human 加载失败是**静默**的（只打一行 log），
    // 由 task-1 的 loadHuman 回头校验 models.stats() 后抛错，这里接住转成 unavailable。
    await liveness.loadHuman()
    if (token !== runToken) return

    const now = performance.now()
    // ★ 与下面的 feedSample / checkTimeout 共用 performance.now()：量纲必须一致
    challengeState.value = createChallenge({ now })
    clockNow.value = now
    phase.value = 'challenge'
    startDetectLoop(token)
  } catch (error) {
    if (token !== runToken) return
    // 模型 / chunk 加载失败也**绝不阻断**：提示后照样能继续考试
    phase.value = 'unavailable'
    unavailableReason.value = describeLivenessError(error)
    stopStream()
  } finally {
    busy.value = false
  }
}

/** 「跳过核验」：等同无法核验（identity_status=3），直接放行 */
function continueWithoutVerify() {
  invalidateRun()
  stopStream()
  continueWith('error', null)
}

/**
 * 放行并回传结论。
 *
 * <p>重试超限（fail 且 retryLeft=0）后点「继续考试」也走这里：
 * 按契约记 `fail`（identity_status=2）并放行，而不是记 error。
 */
function continueWith(outcome: FaceVerifyOutcome, snapshot?: string | null) {
  if (finished) return
  finished = true
  const evidence = snapshot === undefined ? snapshotUrl.value : snapshot
  invalidateRun()
  stopStream()
  emit('finish', {
    outcome,
    snapshot: evidence,
    // DER-34：比对做了就记 2 并带上相似度；没做记 1（仅活体）。
    // 后端不重算相似度（方案 A 的既定取舍），它只负责如实存下来。
    method: compareOutcome.value?.compared ? 2 : 1,
    similarity: compareOutcome.value?.similarity ?? null
  })
  visible.value = false
}

// 打开即请求摄像头；关闭即释放（含停检测循环）
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      retried.value = 0
      challengeState.value = null
      validSamples = 0
      await nextTick()
      await openCamera()
    } else {
      teardown()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  teardown()
})

defineExpose({ MAX_FACE_RETRY, phase, challengeState })
</script>

<style scoped lang="scss">
.face-verify-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px 0;
    margin-right: 0;
  }

  :deep(.el-dialog__title) {
    font-size: 16px;
    line-height: 24px;
    font-weight: 500;
    color: #262626;
  }

  :deep(.el-dialog__body) {
    padding: 16px 24px 0;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px 20px;
  }
}

.camera-box {
  position: relative;
  width: 100%;
  height: 270px;
  overflow: hidden;
  background: #f2f2f2;
  border-radius: 2px;
}

.camera-video {
  display: block;
  width: 100%;
  height: 270px;
  /* 人脸是竖构图，cover 比 contain 更接近原视角，且不留黑边 */
  object-fit: cover;
  /* 正面摄像头要给镜像，否则学员会觉得左右反了 */
  transform: scaleX(-1);
}

.camera-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
  font-size: 14px;
  line-height: 22px;
}

/* 动作提示条：压在画面底部，不遮住脸（学员要能看见自己转没转到位） */
.challenge-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.55);
  text-align: center;
}

.challenge-prompt {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: #ffffff;
}

.challenge-countdown {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: rgba(255, 255, 255, 0.8);
}

.face-tip {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: #262626;
  text-align: center;
}

.face-note {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 20px;
  color: #8c8c8c;
  text-align: center;
}

.result-block {
  padding: 8px 0 4px;
  text-align: center;
}

.result-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  font-size: 26px;
  line-height: 48px;
  font-weight: 500;

  &.is-pass {
    background: #f6ffed;
    color: #52c41a;
  }

  &.is-fail {
    background: #fff1f0;
    color: #f5222d;
  }

  &.is-warn {
    background: #fffbe6;
    color: #fa8c16;
  }
}

.result-title {
  margin: 0 0 8px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: #262626;
}

.result-desc {
  margin: 0;
  font-size: 14px;
  line-height: 22px;
  color: #595959;
}

.result-reason {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 20px;
  color: #8c8c8c;
}

.face-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
</style>
