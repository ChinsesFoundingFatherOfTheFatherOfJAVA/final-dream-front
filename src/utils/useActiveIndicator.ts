import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

export interface ActiveIndicatorOptions {
  /** 指示器轴向：x = 横向滑动下划线，y = 纵向滑动侧边线 */
  axis?: 'x' | 'y'
  /** 激活项选择器，默认 '.nav-item.active' */
  itemSelector?: string
}

/**
 * 激活项指示器定位（横向下划线 / 纵向侧边线共用）。
 *
 * 为什么必须测量：激活项尺寸随文案、字重（600）变化，单条指示器要精确落到目标项上，
 * 纯 CSS 只有把每一项都复制一份标记才做得到，代价是响应式/换行时错位。
 * 这里只测一次「激活项相对容器的偏移与长度」，交给 CSS 用 transform + 尺寸过渡，
 * 不在每帧改 left/top，避免容器反复重排。
 *
 * 重测触发点：路由变化、容器尺寸变化（含 v-if 项出现/消失）、字体加载完成。
 */
export function useActiveIndicator(
  containerRef: Ref<HTMLElement | null>,
  options: ActiveIndicatorOptions = {}
) {
  const axis = options.axis ?? 'x'
  const selector = options.itemSelector ?? '.nav-item.active'
  const position = ref(0)
  const size = ref(0)
  const shown = ref(false)

  let observer: ResizeObserver | undefined

  /** 读取激活项几何写入响应式状态；没有激活项时淡出，而不是归零滑到起点 */
  const sync = () => {
    const box = containerRef.value
    if (!box) return
    const active = box.querySelector<HTMLElement>(selector)
    if (!active) {
      shown.value = false
      return
    }
    const boxRect = box.getBoundingClientRect()
    const rect = active.getBoundingClientRect()
    position.value = axis === 'x' ? rect.left - boxRect.left : rect.top - boxRect.top
    size.value = axis === 'x' ? rect.width : rect.height
    shown.value = true
  }

  /** 等一帧再测：字重刚变完就测会拿到旧尺寸，指示器会停在差一点的位置 */
  const syncOnNextFrame = () => {
    void nextTick(() => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(sync)
      else setTimeout(sync, 0)
    })
  }

  onMounted(() => {
    syncOnNextFrame()
    // 字体是后加载的：字宽变了要重测，否则指示器长度对不上文字
    void document.fonts?.ready.then(sync)
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      observer = new ResizeObserver(sync)
      observer.observe(containerRef.value)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })

  const route = useRoute()
  watch(
    () => route.path,
    () => syncOnNextFrame()
  )

  return { position, size, shown, sync }
}