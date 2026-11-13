/**
 * 人脸比对编排（2026-11-13，DER-34）。
 *
 * <p>**职责边界**：把「基准图 → 特征向量」和「抓拍向量 vs 基准向量 → 结论」串起来。
 * 纯数学在 `faceMatch.ts`，检测原语在 `faceLiveness.ts`，本模块只做编排。
 *
 * <p>**方案 A 的能力边界（必须记住）**：
 * 比对全程在前端完成，**防不住能改前端代码的人**。它的真实价值是：
 * ①让顺手替考的人被记录下来；②给批阅人一个「相似度」的客观参考。
 * 真要防有动机的作弊，前置条件是**官方基准照**（管理员当面采集），不是更强的算法。
 *
 * <p>**失败一律不阻断**：基准图加载失败、模型加载失败、算不出特征，
 * 全部返回「未比对」而不是抛错——核验本身（DER-07）都不阻断，比对更不能。
 */
import { detectOnce, loadHumanWith } from './faceLiveness'
import { matchFace, resolveThreshold } from './faceMatch'

/** 比对结论 */
export interface FaceCompareOutcome {
  /** 是否真的完成了比对（false 时 similarity 为 null，调用方应记「仅活体」） */
  compared: boolean
  /** 相似度 0..1；未比对为 null */
  similarity: number | null
  /**
   * 是否判定为同一人（距离 ≤ 阈值）。**未比对时为 null**。
   *
   * <p>★ 这个字段是比对能真正生效的关键：2026-11-13 实测发现，
   * 原先只返回 `similarity` 而把 `matched` 丢在函数内部，
   * 导致下游无从判断，**相似度 0.10 也被记成 identity_status=1（通过）**，
   * 等同于比对完全没用。
   */
  matched: boolean | null
  /** 欧氏距离；未比对为 null */
  distance: number | null
  /** 未比对的原因（用于日志/调试，不展示给学员） */
  reason: string | null
}

const NOT_COMPARED = (reason: string): FaceCompareOutcome => ({
  compared: false,
  similarity: null,
  distance: null,
  matched: null,
  reason
})

/**
 * 把一张图片 URL 算成特征向量。
 *
 * <p>**为什么要绕 canvas**：`detectOnce` 只接受 `<video>`，而基准照是静态图。
 * 这里借助 `canvas.captureStream()` 把静态图画成一个「假视频流」喂进去——
 * 这样能复用完全相同的一套检测代码，不必为静态图单独维护一条模型调用路径
 * （两条路径的预处理差异会让同一张脸算出不同向量，比对就失去意义）。
 *
 * @returns 特征向量；任何失败返回 null
 */
export async function embeddingFromImageUrl(imageUrl: string): Promise<number[] | null> {
  let video: HTMLVideoElement | null = null
  let stream: MediaStream | null = null
  try {
    // 先确保 embedding 模型可用：算不出就早点退出，不用白加载图片
    await loadHumanWith({ withEmbedding: true })

    const img = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    if (!canvas.width || !canvas.height) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // captureStream(1)：只要 1fps，因为这只是一帧静态图
    stream = canvas.captureStream(1)
    video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    await video.play()
    // 等元数据就绪：readyState < 2 时 detectOnce 会直接返回「视频尚未就绪」
    await waitForVideoReady(video)

    const frame = await detectOnce(video, { withEmbedding: true })
    if (frame.error || frame.faceCount !== 1) return null
    return frame.embedding
  } catch {
    return null
  } finally {
    // 一定释放：不 stop 的话 canvas 的 track 会一直挂着，摄像头指示灯虽不亮但资源不释放
    stream?.getTracks().forEach((t) => t.stop())
    if (video) {
      video.srcObject = null
    }
  }
}

/** 等比加载图片；跨域失败（CORS/404）会 reject，由调用方兜住 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // 基准图与页面同源（都在 /api/exam/files/**），crossOrigin 只是保险
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('基准图加载失败'))
    img.src = url
  })
}

/** 等 video 达到可解码状态（readyState >= 2），最多等 2 秒 */
function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState >= 2) return resolve()
    const started = Date.now()
    const timer = setInterval(() => {
      if (video.readyState >= 2 || Date.now() - started > timeoutMs) {
        clearInterval(timer)
        resolve()
      }
    }, 50)
  })
}

/**
 * 比对：抓拍帧的向量 vs 基准照的向量。
 *
 * @param probeEmbedding 本次核验抓拍算出的向量（由调用方传入，避免重复检测）
 * @param baselineUrl 基准照 URL；为空表示学员没录入过
 * @param threshold 欧氏距离阈值，默认 `DEFAULT_MATCH_THRESHOLD`
 */
export async function compareWithBaseline(
  probeEmbedding: number[] | null,
  baselineUrl: string | null | undefined,
  threshold?: number
): Promise<FaceCompareOutcome> {
  const usedThreshold = threshold ?? resolveThreshold()
  if (!baselineUrl) return NOT_COMPARED('未录入基准照')
  if (!probeEmbedding) return NOT_COMPARED('本次抓拍未算出特征向量')

  const baselineEmbedding = await embeddingFromImageUrl(baselineUrl)
  if (!baselineEmbedding) return NOT_COMPARED('基准照未能算出特征向量')

  const result = matchFace(probeEmbedding, baselineEmbedding)
  if (!result) return NOT_COMPARED('特征向量维度不一致或含非法值')

  // 判定用距离直接比阈值（相似度只用于展示，多一层映射就多一个读错的地方）
  const matched = result.distance <= usedThreshold
  return {
    compared: true,
    // 不匹配时也返回相似度：批阅人需要看到「差多少」，只给个「不通过」没法判断是光照问题还是换了人
    similarity: result.similarity,
    distance: result.distance,
    matched,
    reason: matched
      ? null
      : `距离 ${result.distance.toFixed(3)} 超过阈值 ${usedThreshold}`
  }
}
