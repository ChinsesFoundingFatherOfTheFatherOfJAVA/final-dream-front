/**
 * hallmark-field.ts — Cobalt ASCII field 生成器（cobalt.md Surfaces 规范的可复用实现）
 *
 * 规范要点：
 * - 生成式字符场，绝不用图片：噪声按 8×16 cell 采样进字符坡道（character ramp）；
 * - 字符色走 --color-glyph-1..4 坡道，最密格用 --color-accent-deep；
 * - field 由产品自身的"流"塑形（如登录页：左侧 raw 未处理、右侧 resolved 处理完）；
 * - prefers-reduced-motion 或无脚本环境退化为静态帧（一次性绘制，无动画循环）；
 * - 全站最多四处可复用（hero 底、一条 divider 行、一块 graphite 面板），每页至多 1-2 处。
 *
 * 用法：<canvas class="hallmark-field" data-field-seed="login"></canvas>
 *       组件挂载后调用 mountHallmarkField(canvas)（或自动扫描 [data-field]）。
 */

/** 字符坡道：由疏到密（对应噪声强度低→高） */
const GLYPH_RAMP = ['·', '∙', '+', '×', '#'] as const;

/** 读取 token 色板（CSS 变量 → 实际色值），失败时给可读回退 */
function readPalette(): string[] {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return [
    read('--color-glyph-1', 'oklch(89% 0.025 254)'),
    read('--color-glyph-2', 'oklch(81% 0.045 255)'),
    read('--color-glyph-3', 'oklch(70% 0.085 256)'),
    read('--color-glyph-4', 'oklch(60% 0.13 257)'),
    read('--color-accent-deep', 'oklch(48% 0.19 262)'),
  ];
}

/** 简易确定性 value-noise（带种子的 2D value noise，双线性插值 + 2 octaves） */
function makeNoise(seed: number) {
  // 8bit 整数 hash → [0,1)，无外部依赖
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sample = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x: number, y: number) => sample(x, y) * 0.65 + sample(x * 2.3, y * 2.3) * 0.35; // 2 octaves
}

export interface FieldOptions {
  /** 塑形函数：将 cell 归一化坐标 [0,1]² 映射为密度偏移 [-0.3,0.3]，用产品的"流"塑形（raw→resolved） */
  shape?: (nx: number, ny: number) => number;
  /** 帧率上限（规范 30fps）；reduced-motion 时忽略（单帧静态） */
  fps?: number;
}

/**
 * 在 canvas 上绘制/驱动 ASCII field。
 * reduced-motion：只画一帧，不启动循环。
 */
export function mountHallmarkField(canvas: HTMLCanvasElement, opts: FieldOptions = {}): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const cellW = 8, cellH = 16; // cobalt.md 规定 8 by 16 cell
  const palette = readPalette();
  const seed = Number(canvas.dataset.fieldSeed ?? '') || 7046;
  const noise = makeNoise(seed);
  const shape = opts.shape ?? ((nx: number) => (nx - 0.5) * 0.24); // 默认轻微左疏右密（raw→resolved）

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, stopTimer = 0, running = true;
  let t0 = performance.now();

  const draw = (now: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '13px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';

    const cols = Math.ceil(w / cellW), rows = Math.ceil(h / cellH);
    const t = reduced ? 0 : (now - t0) / 1000;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const nx = c / cols, ny = r / rows;
        // 慢速漂移让 field"活"但不抢戏（reduced-motion 时 t=0 完全静止）
        const n = noise(c * 0.18 + t * 0.06, r * 0.36) + shape(nx, ny);
        const d = Math.max(0, Math.min(0.999, n)); // 密度 [0,1)
        const glyph = GLYPH_RAMP[Math.floor(d * GLYPH_RAMP.length)];
        // 最密格用 accent-deep（规范），其余按坡道 4 档
        const color = (d > 0.82 ? palette[4] : palette[Math.min(3, Math.floor(d * 4))]) ?? palette[0]!;
        ctx.fillStyle = color;
        ctx.fillText(glyph ?? '·', c * cellW, r * cellH);
      }
    }
  };

  const frame = (now: number) => {
    if (!running) return;
    draw(now);
    if (reduced) return; // 静态帧：画一次即止
    // 30fps 节流（规范）：每帧至少间隔 33ms
    stopTimer = window.setTimeout(() => { raf = requestAnimationFrame(frame); }, 33);
  };

  // 离屏暂停：field 不在视口时不消耗
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && !reduced) {
        if (!running) { running = true; t0 = performance.now(); raf = requestAnimationFrame(frame); }
      } else if (!e.isIntersecting) {
        running = false;
        clearTimeout(stopTimer);
        cancelAnimationFrame(raf);
      }
    }
  });
  io.observe(canvas);

  raf = requestAnimationFrame(frame);

  return () => { // 卸载清理
    running = false;
    clearTimeout(stopTimer);
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}

/** 扫描页面内所有 [data-field] canvas 并挂载；返回卸载函数集合（Vue onUnmounted 调用） */
export function mountAllFields(root: ParentNode = document): Array<() => void> {
  const stops: Array<() => void> = [];
  (root.querySelectorAll('canvas[data-field]') as NodeListOf<HTMLCanvasElement>).forEach((cv) => {
    stops.push(mountHallmarkField(cv));
  });
  return stops;
}
