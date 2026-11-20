import { type Ref } from 'vue'
import { useActiveIndicator } from './useActiveIndicator'

/**
 * 顶部导航「滑动下划线」的指示器定位（横向）。
 *
 * 实现已下沉到 useActiveIndicator（纵向侧边线共用同一套测量逻辑），
 * 这里保留原有命名 x / width / shown，避免改动两处顶栏的调用方。
 */
export function useNavUnderline(navRef: Ref<HTMLElement | null>) {
  const { position, size, shown, sync } = useActiveIndicator(navRef, {
    axis: 'x',
    itemSelector: '.nav-item.active'
  })

  return { x: position, width: size, shown, sync }
}