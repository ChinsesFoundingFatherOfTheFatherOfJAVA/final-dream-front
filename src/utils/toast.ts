export type ToastType = 'error' | 'warn' | 'info'

/**
 * 非阻塞的全局轻提示。
 *
 * 为什么不用 alert()：alert 会同步冻结 JS 主线程，录音与 ASR/TTS 上传期间的
 * 一次网络抖动就能把页面卡死几十秒；报告页轮询更是刻意"连续失败 3 次才提示"，
 * 而 alert 让每次抖动都弹窗，重试逻辑形同虚设。
 */

const MAX_VISIBLE = 4
const DEFAULT_DURATION = 3000
const STYLE_ID = 'qoder-toast-style'

let container: HTMLElement | null = null

const ensureContainer = (): HTMLElement => {
  if (container && document.body.contains(container)) return container
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .qt-toast-box{position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:4000;
        display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
      .qt-toast{pointer-events:auto;max-width:min(560px,90vw);padding:9px 18px;border-radius:8px;
        font-size:13px;line-height:1.6;color:#fff;cursor:pointer;word-break:break-all;
        box-shadow:0 6px 20px rgba(0,0,0,.18);opacity:0;transform:translateY(-8px);
        transition:opacity .18s ease,transform .18s ease}
      .qt-toast.in{opacity:1;transform:translateY(0)}
      .qt-toast.error{background:#e54545}
      .qt-toast.warn{background:#e9a23b}
      .qt-toast.info{background:#3b4252}
    `
    document.head.appendChild(style)
  }
  container = document.createElement('div')
  container.className = 'qt-toast-box'
  container.setAttribute('role', 'status')
  container.setAttribute('aria-live', 'polite')
  document.body.appendChild(container)
  return container
}

const show = (text: string, type: ToastType, duration: number) => {
  const box = ensureContainer()
  const el = document.createElement('div')
  el.className = `qt-toast ${type}`
  el.textContent = text
  const remove = () => {
    if (!el.isConnected) return
    el.classList.remove('in')
    window.setTimeout(() => el.remove(), 200)
  }
  el.addEventListener('click', remove)
  box.appendChild(el)
  while (box.children.length > MAX_VISIBLE) box.firstElementChild?.remove()
  requestAnimationFrame(() => el.classList.add('in'))
  window.setTimeout(remove, duration)
}

export const toast = {
  error: (text: string, duration = DEFAULT_DURATION) => show(text, 'error', duration),
  warn: (text: string, duration = DEFAULT_DURATION) => show(text, 'warn', duration),
  info: (text: string, duration = DEFAULT_DURATION) => show(text, 'info', duration),
  /** 操作成功提示（window.alert 的成功场景替代） */
  success: (text: string, duration = DEFAULT_DURATION) => show('✓ ' + text, 'info', duration)
}
