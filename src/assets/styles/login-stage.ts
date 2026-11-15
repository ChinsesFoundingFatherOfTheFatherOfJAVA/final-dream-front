/**
 * 登录舞台：透视地平线网格 + 粒子连线。
 *
 * 手法来自 particles.js（Vincent Garreau，MIT）的近距连线粒子，加上透视地网格。
 * 自写 canvas，不引入运行时依赖。色值只读 Cobalt token。
 * prefers-reduced-motion：画一帧静态场面后停，不跟鼠标。
 */
export function mountLoginStage(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const rgbOf = (token: string): string => {
    const probe = document.createElement('span')
    probe.style.color = `var(${token})`
    probe.style.position = 'absolute'
    probe.style.left = '-9999px'
    document.body.appendChild(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  }

  const fade = (rgb: string, alpha: number): string => {
    const parts = rgb.match(/[\d.]+/g)
    if (!parts || parts.length < 3) return rgb
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`
  }

  const accent = rgbOf('--color-accent')
  const accent2 = rgbOf('--color-accent-2')
  const deep = rgbOf('--color-accent-deep')

  let width = 1
  let height = 1
  let drift = 0
  let running = true
  let raf = 0
  let pointerX = -9999
  let pointerY = -9999

  type Particle = { x: number; y: number; vx: number; vy: number }
  let particles: Particle[] = []

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = Math.round(Math.min(88, Math.max(36, (width * height) / 17000)))
    if (particles.length !== count) {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.72,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
      }))
    }
  }

  const drawGrid = () => {
    const vanishX = width * 0.36 + (reduced || pointerX < 0 ? 0 : (pointerX / width - 0.5) * 48)
    const horizon = height * 0.42
    ctx.lineWidth = 1
    ctx.strokeStyle = fade(accent, 0.34)
    ctx.beginPath()
    const rows = 18
    for (let i = 0; i < rows; i++) {
      const t = ((i + drift) % rows) / rows
      const y = horizon + (height - horizon + 48) * Math.pow(t, 1.4)
      const spread = (y - horizon) / Math.max(1, height - horizon)
      ctx.moveTo(vanishX - spread * width * 1.4, y)
      ctx.lineTo(vanishX + spread * width * 1.7, y)
    }
    ctx.stroke()

    ctx.strokeStyle = fade(accent2, 0.2)
    ctx.beginPath()
    for (let i = -16; i <= 20; i++) {
      ctx.moveTo(vanishX, horizon)
      ctx.lineTo(vanishX + i * (width / 14), height + 12)
    }
    ctx.stroke()

    const glow = ctx.createLinearGradient(0, horizon - 70, 0, horizon + 36)
    glow.addColorStop(0, fade(deep, 0))
    glow.addColorStop(0.62, fade(accent, 0.28))
    glow.addColorStop(1, fade(accent, 0))
    ctx.fillStyle = glow
    ctx.fillRect(0, horizon - 70, width, 110)
  }

  const drawParticles = () => {
    const link = 120
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!
      if (!reduced) {
        const dx = p.x - pointerX
        const dy = p.y - pointerY
        const dist = Math.hypot(dx, dy)
        if (dist < 150 && dist > 0.01) {
          p.vx += (dx / dist) * 0.07
          p.vy += (dy / dist) * 0.07
        }
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.986
        p.vy *= 0.986
        if (p.x < -24) p.x = width + 24
        if (p.x > width + 24) p.x = -24
        if (p.y < -24) p.y = height * 0.7
        if (p.y > height * 0.76) p.y = -12
      }
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j]!
        const d = Math.hypot(p.x - q.x, p.y - q.y)
        if (d < link) {
          ctx.strokeStyle = fade(accent2, (1 - d / link) * 0.38)
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(q.x, q.y)
          ctx.stroke()
        }
      }
      ctx.fillStyle = fade(accent2, 0.9)
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const frame = () => {
    if (!running) return
    ctx.clearRect(0, 0, width, height)
    if (!reduced) drift = (drift + 0.018) % 18
    drawGrid()
    drawParticles()
    if (reduced) return
    raf = requestAnimationFrame(frame)
  }

  const onResize = () => {
    resize()
    if (reduced) frame()
  }
  const onPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    pointerX = event.clientX - rect.left
    pointerY = event.clientY - rect.top
  }
  const onVisibility = () => {
    if (reduced) return
    if (document.hidden) {
      running = false
      cancelAnimationFrame(raf)
      return
    }
    if (!running) {
      running = true
      raf = requestAnimationFrame(frame)
    }
  }

  resize()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true })
  raf = requestAnimationFrame(frame)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
