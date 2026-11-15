/**
 * hallmark-icon.ts — HallmarkIcon 动效图标基建（Lordicon 免费档，本地托管）
 *
 * 设计要点（对照 hallmark-field.ts 模式）：
 * - Lordicon JSON 离线托管在 src/assets/icons/animated/<name>.json，禁止 CDN；
 * - JSON 懒加载：首次渲染才 import()（Vite 会按 chunk 分包）；
 * - prefers-reduced-motion：不注册动画，直接渲染静态首帧（Lordicon state:morph 的第 0 帧）；
 * - 组件卸载 destroy 动画实例，防泄漏；
 * - 依赖说明：@lordicon/element@^3.0.2 + lottie-web@^5.13.0 已安装（2026-11-14 captain 经官方源
 *   绕过失效的旧淘宝 registry 落地）；lord-icon web component 由 HallmarkIcon.vue 的动态
 *   import('@lordicon/element') 注册；依赖缺失/reduced-motion/JSON 未就位三路降级保持不变。
 */

export type HallmarkIconName = 'chat' | 'trophy' | 'edit' | 'reading' | 'workbench' | 'course'

/**
 * 可用图标名（对应 src/assets/icons/animated/<name>.json）
 *
 * 挑图清单（lordicon.com 免费库人工下载，全部选「line/outline 线性系」同一家族，
 * 下载页选 Cobalt/单色导出 JSON 拖到 src/assets/icons/animated/；钴蓝着色由运行时 colors 覆盖，素材色无关）：
 *
 * - chat：AI对练卡。搜索 "chat bubble" / "conversation"；挑简洁对话气泡+闪光，24×24 线性；
 * - trophy：AI实战训练场卡。搜索 "trophy" / "award"；奖杯+星星微动，线性无填充；
 * - edit：测练中心卡。搜索 "editing" / "pencil document"；笔+文档勾选动效；
 * - reading：在线课堂卡。搜索 "online learning" / "book"；翻开书本+播放键；
 * - workbench：顶栏工作台（小尺寸 14px）。搜索 "dashboard" / "apps grid"；九宫格呼吸式；
 * - course：CTA/登录低调位。搜索 "graduation cap" / "e-learning"；学位帽+翻页，含 morph 状态帧。
 *
 * 验收口径：同一家族风格（同作者/同 collection 最佳）、状态帧含 hover + morph、JSON < 80KB/个。\n */

export interface HallmarkIconColors {
  /** 主色（cobalt 单色化：传 --color-accent 解析后的色值） */
  primary?: string
  /** 辅色（accent-2） */
  secondary?: string
}

/** 从 CSS 变量解析实际色值（Lordicon colors 需要具体色值而非 var()） */
export function resolveTokenColor(varName: string, fallback: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback
  } catch {
    return fallback
  }
}

/** reduced-motion：跳过动画注册，渲染静态帧 */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** 懒加载图标 JSON（Vite import() 分包，失败返回 null 由组件降级） */
export async function loadIconJson(name: HallmarkIconName): Promise<unknown | null> {
  try {
    const mod = await import(`../assets/icons/animated/${name}.json`)
    return (mod as { default?: unknown }).default ?? mod
  } catch {
    // JSON 未就位（素材尚未拖入）时静默降级，不阻塞页面
    return null
  }
}

/** 运行时探测 lord-icon web component 是否可用（依赖装好且已注册） */
export function isLordiconAvailable(): boolean {
  try {
    return typeof customElements !== 'undefined' && !!customElements.get('lord-icon')
  } catch {
    return false
  }
}
