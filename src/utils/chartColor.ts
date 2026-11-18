/**
 * echarts 颜色桥接：把 CSS 侧的 token/颜色值变成 echarts 能真正解析的 rgba。
 *
 * 为什么需要这一层：全站颜色走 hallmark-tokens 的 CSS 变量（AGENTS 第 4 节 Floor 1），
 * 但那些变量声明成 `oklch(...)`，且组件里惯用 `color: 'var(--color-accent)'` 这种写法。
 * echarts/zrender 既不认识 `var()`（它不是 CSS，不参与层叠解析），
 * 内部的颜色运算也只认 hex/rgb/hsl —— `oklch` 会被原样透传进 canvas。
 *
 * 实测症状：默认状态线能画（浏览器自己理解 oklch），一旦 hover 触发 emphasis 高亮，
 * zrender 要对颜色做提亮运算，拿到无法解析的值就产出无效颜色，整条线消失。
 * 用 `var()` 的更彻底：自始至终都是无效色，图表实际用的是 echarts 默认调色板，
 * 主题色从来没生效过，只因没走到颜色运算分支才一直没被发现。
 *
 * 解法：先用 getComputedStyle 把 `var(--x)` 换成真实值，
 * 再借 canvas 让浏览器自己把任意 CSS 颜色（oklch/oklab/color-mix/…）归一化成 rgba。
 * 浏览器能画什么，这里就能转什么，不必自己维护一份颜色格式清单。
 */

/** 结果缓存：同一 token 一次会话内不会变，避免每次重绘都建 canvas 读像素 */
const cache = new Map<string, string>()

/** 是否含有需要 CSS 层叠解析的 var() 引用 */
function hasVarRef(value: string): boolean {
  return value.includes('var(')
}

/** 把形如 var(--color-x) / var(--x, fallback) 的引用替换成计算值；无 fallback 且取不到时保留原样 */
function resolveVarRefs(value: string): string {
  return value.replace(
    /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*?))?\s*\)/g,
    (whole, name: string, fallback?: string) => {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      if (computed) return computed
      return fallback !== undefined ? fallback.trim() : whole
    }
  )
}

/**
 * 任意 CSS 颜色 → `rgba(r, g, b, a)`。
 *
 * 归一化交给浏览器：先铺一层全透明哨兵再覆盖目标色，读回像素即可。
 * 无效颜色不会覆盖 fillStyle，读到的仍是透明哨兵——据此判断成败，
 * 比字符串正则匹配稳得多（不用列举 oklch/oklab/lab/color-mix/light-dark…）。
 *
 * 解析失败时返回空串：交给 echarts 回落默认调色板，不会画出脏色。
 */
export function chartColor(value: string): string {
  if (!value) return ''
  const key = value.trim()
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const resolved = hasVarRef(key) ? resolveVarRefs(key) : key
  let out = ''
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // 哨兵必须是全透明：无效颜色赋值不会改变 fillStyle，读到的就是它
      ctx.fillStyle = 'rgba(0, 0, 0, 0)'
      ctx.fillStyle = resolved
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillRect(0, 0, 1, 1)
      const pixel = ctx.getImageData(0, 0, 1, 1).data
      // alpha=0 有两种可能：本来就是透明色，或解析失败。两者都当「不需要画色」处理
      const r = pixel[0] ?? 0
      const g = pixel[1] ?? 0
      const b = pixel[2] ?? 0
      const a = pixel[3] ?? 0
      if (a > 0) out = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
    }
  }
  cache.set(key, out)
  return out
}

/** 只处理像颜色的字符串，避免误伤 data 名、formatter 模板等普通文本 */
function looksLikeColor(value: string): boolean {
  return hasVarRef(value) || /\(\s*[\d%.]/.test(value)
}

/**
 * 深度遍历 echarts option，把其中的颜色字符串就地换成 rgba。
 *
 * 为什么做整棵树的转换而不是逐处改配置：图表配置分散在 7 个组件、几十处颜色字段，
 * 手改一处漏一处的成本远高于一层遍历；而且以后新增配色字段不用再想「记得转换」。
 *
 * 安全边界：只递归数组与纯对象（字面量对象/普通对象），
 * 函数、类实例、DOM 节点一律原样返回——formatter 回调必须保持引用不变，
 * echarts 依赖它们的函数身份。
 */
export function resolveChartColors<T>(input: T): T {
  if (typeof input === 'string') {
    return (looksLikeColor(input) ? chartColor(input) || input : input) as unknown as T
  }
  if (Array.isArray(input)) {
    return input.map((item) => resolveChartColors(item)) as unknown as T
  }
  if (input && typeof input === 'object') {
    const proto = Object.getPrototypeOf(input)
    // 仅处理对象字面量 / Object.create(null)，其余（Date、Map、ECharts 内部实例）不碰
    if (proto !== Object.prototype && proto !== null) return input
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = resolveChartColors(v)
    }
    return out as unknown as T
  }
  return input
}
