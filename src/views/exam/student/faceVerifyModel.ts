/**
 * 人脸核验的判定口径（契约 01 §S3，决策 DER-07）。
 *
 * <p>抽成纯函数而不是写在弹窗里，是因为这里承载的是**全模块最硬的一条约束**：
 * 任何失败路径都必须能继续考试。这类「不许拦住学员」的性质只有配单测才守得住——
 * 否则后续任何人给摄像头失败分支加一句 `return`，功能就悄悄变成硬闸门了。
 *
 * <p>`/exam/student/components/FaceVerifyDialog.vue` 只负责采集与展示，结论全从这里出。
 */

/** 核验结论，与 `exam_attempt.identity_status` 口径对齐 */
export type FaceVerifyOutcome = 'pass' | 'fail' | 'error'

/** 一次核验的结果：status 落库，snapshot 是抓拍图 dataURL（由外层上传） */
export interface FaceVerifyResult {
  outcome: FaceVerifyOutcome
  /** 抓拍图 dataURL；摄像头不可用时为 null */
  snapshot: string | null
  /**
   * 核验手段（2026-11-13，DER-34）：**1 仅活体 / 2 活体 + 基准照比对**。
   *
   * <p>为何要单独上报：`outcome=pass` 分不清是“只证明屏幕前是活人”
   * 还是“还比对过是本人”，批阅人靠这个字段才能判断证据强度。
   */
  method?: number
  /**
   * 人脸比对相似度 0..1；**未做比对时为 null**。
   *
   * <p>不论比对是否通过都上报：批阅人需要看到「差多少」才能分清
   * 是光线/角度导致的不像，还是真换了人。只给“不通过”没法判断。
   */
  similarity?: number | null
}

/** 核验结论 → `exam_attempt.identity_status`（契约 04 §11B.2：0未核验 1通过 2不通过 3无法核验） */
export const IDENTITY_STATUS: Record<FaceVerifyOutcome, number> = {
  pass: 1,
  fail: 2,
  error: 3
}

/** 契约 01 §S3：重试上限 3 次，超限按 `fail` 记录并放行 */
export const MAX_FACE_RETRY = 3

/**
 * 放行判定：**恒为 true**。
 *
 * <p>写成函数而不是让调用方 `if (...)` 判断，是为了让「核验绝不阻断」这条规则
 * 有一个可断言的名字：单测直接断言它对三种结论都返回 true，
 * 任何人想改成条件判断都得先改掉这个测试。
 */
export function canAlwaysContinue(_outcome: FaceVerifyOutcome): boolean {
  return true
}

/**
 * 把 `getUserMedia` 的异常译成学员能看懂的原因。
 *
 * <p>不认识的错误也给通用文案，**绝不返回空串**：空原因会让弹窗只剩
 * 「无法使用摄像头」一句，学员不知道该改哪里。
 */
export function describeCameraError(error: unknown): string {
  const name = (error as { name?: string })?.name ?? ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return '摄像头权限被拒绝，请在浏览器地址栏的权限设置里允许后重试'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return '未检测到可用的摄像头设备'
    case 'NotReadableError':
    case 'TrackStartError':
      return '摄像头被其他程序占用'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return '摄像头不支持所需的画面参数'
    case 'SecurityError':
      return '安全限制导致无法访问摄像头'
    case 'AbortError':
      return '摄像头启动被中断'
    case 'TypeError':
      return '当前浏览器不支持获取摄像头画面'
    default: {
      const message = error instanceof Error ? error.message : ''
      return message || '未知错误'
    }
  }
}

/**
 * 当前环境是否具备调用摄像头的前提。
 *
 * <p>`getUserMedia` 只在 HTTPS 或 localhost 下存在；内网 http 访问时它是 undefined。
 * 这一步**必须在调 `getUserMedia` 之前判断**，否则会抛 TypeError，
 * 而 TypeError 的原因文案会误导学员以为是自己设备坏了。
 *
 * <p>入参留成松散的 `unknown` 形状而不是 `Navigator`：单测要能直接构造
 * `{}` / `{ mediaDevices: {} }` 这类不完整对象，用 `Navigator` 会逼着测试伪造整个对象。
 */
export function hasCameraApi(target?: unknown): boolean {
  const scope =
    target !== undefined ? target : typeof navigator === 'undefined' ? undefined : navigator
  if (!scope || typeof scope !== 'object') return false
  const mediaDevices = (scope as { mediaDevices?: unknown }).mediaDevices
  if (!mediaDevices || typeof mediaDevices !== 'object') return false
  return typeof (mediaDevices as { getUserMedia?: unknown }).getUserMedia === 'function'
}

/** 摄像头不可用时的原因文案（环境不支持时用，与 describeCameraError 区分开） */
export const NO_CAMERA_API_REASON =
  '当前浏览器或访问环境不支持摄像头（需要 HTTPS 或 localhost）'

/**
 * 剩余可重试次数；不会为负。
 *
 * <p>UI 用它决定「再试一次」显不显示：为 0 时只留「继续考试」，
 * 这样「重试上限 3 次」由界面结构保证，而不是靠一次 if 判断（契约 01 §S3）。
 */
export function retryLeftOf(retried: number): number {
  return Math.max(0, MAX_FACE_RETRY - retried)
}
