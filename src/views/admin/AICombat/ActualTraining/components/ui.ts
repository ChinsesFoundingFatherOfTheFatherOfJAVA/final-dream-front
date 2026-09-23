/**
 * AI实战训练场模块轻量 UI 提示（工程约定：不使用 Element Plus，样式手写）
 */

let toastContainer: HTMLElement | null = null

function ensureContainer(): HTMLElement {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer
  toastContainer = document.createElement('div')
  toastContainer.style.cssText = [
    'position:fixed',
    'top:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:9999',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:8px',
    'pointer-events:none'
  ].join(';')
  document.body.appendChild(toastContainer)
  return toastContainer
}

export function showToast(message: string, duration = 2000): void {
  const container = ensureContainer()
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText = [
    'padding:10px 20px',
    'background:#333',
    'color:#fff',
    'border-radius:6px',
    'font-size:14px',
    'box-shadow:0 4px 16px rgba(0,0,0,0.2)',
    'opacity:0',
    'transition:opacity 0.25s'
  ].join(';')
  container.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, duration)
}

/** 占位功能统一提示 */
export function comingSoon(message = '功能建设中'): void {
  showToast(message)
}
