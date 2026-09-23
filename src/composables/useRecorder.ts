import { ref } from 'vue'

/**
 * FP-24 录音组合式函数（v1.1）
 * getUserMedia → AudioContext(16kHz) + ScriptProcessor 采 PCM → 手写 WAV 编码（44 字节头）→ Blob
 * （按技术方案 5.2 规定不用 MediaRecorder，保证产物为 WAV 16kHz 单声道，可直接送后端 ASR）
 */
export interface RecordResult {
  blob: Blob
  durationMs: number
}

const MAX_RECORD_MS = 60_000 // 后端限制录音 ≤ 60s

export function useRecorder() {
  const recording = ref(false)
  const error = ref<string>('')
  /** 距 60s 上限的剩余毫秒数：录音中每 250ms 刷新，供 UI 倒计时（未在录音时恒为上限值） */
  const remainingMs = ref(MAX_RECORD_MS)

  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let processor: ScriptProcessorNode | null = null
  let muteGain: GainNode | null = null
  let chunks: Float32Array[] = []
  let sampleRate = 16000
  let autoStopTimer: number | null = null
  let tickTimer: number | null = null
  let startedAt = 0
  let onAutoStop: ((r: RecordResult) => void) | null = null

  /** 开始录音；麦克风权限被拒时抛出原始异常（由调用方提示并切键盘模式） */
  async function start(): Promise<void> {
    if (recording.value) return
    error.value = ''

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = '当前浏览器不支持录音'
      throw new Error(error.value)
    }

    // 权限被拒（NotAllowedError）等异常向上抛。
    // echoCancellation 必开：陪练者 TTS 是外放播放的，不开 AEC 会把问题本身录进学员答案里
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    try {
      audioContext = new AudioContext({ sampleRate: 16000 })
      // 部分环境不严格遵守 sampleRate 选项，以实际值为准（WAV 头用）
      sampleRate = audioContext.sampleRate
      sourceNode = audioContext.createMediaStreamSource(mediaStream)
      processor = audioContext.createScriptProcessor(4096, 1, 1)
      chunks = []

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (recording.value) {
          chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
        }
      }

      // 静音输出节点：onaudioprocess 需连通 destination 才触发，经 gain=0 避免麦克风回声
      muteGain = audioContext.createGain()
      muteGain.gain.value = 0
      sourceNode.connect(processor)
      processor.connect(muteGain)
      muteGain.connect(audioContext.destination)

      recording.value = true
      startedAt = Date.now()
      remainingMs.value = MAX_RECORD_MS
      tickTimer = window.setInterval(() => {
        remainingMs.value = Math.max(0, MAX_RECORD_MS - (Date.now() - startedAt))
      }, 250)

      // 超过 60s 自动停止（后端拒绝超长录音）
      autoStopTimer = window.setTimeout(() => {
        if (recording.value) {
          const result = stop()
          if (result) {
            onAutoStop?.(result)
          }
        }
      }, MAX_RECORD_MS)
    } catch (e) {
      cleanup()
      error.value = '录音初始化失败'
      throw e
    }
  }

  /** 停止录音并返回 WAV Blob；未在录音时返回 null */
  function stop(): RecordResult | null {
    if (!recording.value) return null
    recording.value = false
    if (autoStopTimer !== null) {
      clearTimeout(autoStopTimer)
      autoStopTimer = null
    }

    const samples = mergeChunks(chunks)
    chunks = []
    const durationMs = samples.length > 0 ? Math.round((samples.length / sampleRate) * 1000) : 0
    const blob = encodeWav(samples, sampleRate)

    cleanup()
    return { blob, durationMs }
  }

  /** 注册 60s 自动停止回调 */
  function setAutoStopHandler(fn: ((r: RecordResult) => void) | null) {
    onAutoStop = fn
  }

  function cleanup() {
    if (tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    remainingMs.value = MAX_RECORD_MS
    try {
      processor && (processor.onaudioprocess = null)
      sourceNode?.disconnect()
      processor?.disconnect()
      muteGain?.disconnect()
      audioContext?.close()
    } catch {
      /* 忽略释放异常 */
    }
    mediaStream?.getTracks().forEach((t) => t.stop())
    sourceNode = null
    processor = null
    muteGain = null
    audioContext = null
    mediaStream = null
  }

  return { recording, error, remainingMs, start, stop, setAutoStopHandler }
}

/** 合并 PCM 分片（导出供测试） */
export function mergeChunks(list: Float32Array[]): Float32Array {
  let total = 0
  for (const c of list) total += c.length
  const merged = new Float32Array(total)
  let offset = 0
  for (const c of list) {
    merged.set(c, offset)
    offset += c.length
  }
  return merged
}

/** 手写 WAV 编码：44 字节头 + 16bit PCM 单声道（导出供测试） */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  // RIFF 头
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true) // RIFF chunk size
  writeString(8, 'WAVE')
  // fmt 子块
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // 格式：PCM
  view.setUint16(22, 1, true) // 声道：单声道
  view.setUint32(24, sampleRate, true) // 采样率
  view.setUint32(28, sampleRate * 2, true) // 字节率 = 采样率×声道×位深/8
  view.setUint16(32, 2, true) // 块对齐
  view.setUint16(34, 16, true) // 位深：16bit
  // data 子块
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // PCM 采样：float [-1,1] → int16
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([view], { type: 'audio/wav' })
}
