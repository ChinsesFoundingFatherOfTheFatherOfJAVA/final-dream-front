import { createApp, type App } from 'vue'
import ConfirmDialog from '@/components/business/ConfirmDialog.vue'

/**
 * 页面级确认弹窗（替代 window.confirm）：
 * `if (!(await confirmDialog({ message: '确定删除吗？', danger: true }))) return`
 * 每次调用挂一个独立实例，resolve 后卸载——无全局状态、无需在页面里放组件。
 */
export function confirmDialog(options: {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const app: App = createApp(ConfirmDialog)
    const instance = app.mount(container) as InstanceType<typeof ConfirmDialog>
    instance.open(options).then((value) => {
      resolve(value)
      app.unmount()
      container.remove()
    })
  })
}
