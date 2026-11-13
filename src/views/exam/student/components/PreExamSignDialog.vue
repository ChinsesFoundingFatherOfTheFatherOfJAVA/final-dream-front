<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="520px"
    class="pre-exam-sign-dialog"
    :close-on-click-modal="false"
    align-center
    @opened="initCanvas"
    @closed="onClosed"
  >
    <p class="sign-tip">
      本考试开启了"签名确认"，请在下面的签名框内按住鼠标拖动进行签名。
    </p>

    <!--
      签名画布。尺寸照原平台实测 getBoundingClientRect 472×266，截图逐像素测得 472×264。

      画布底色 #f2f2f2、**无边框**——原平台实测四周是纯色块，没有 1px 描边，
      文档 §2 写的"细边框"与截图不符，以截图为准。

      事件直接绑在模板上而不是 addEventListener：`el-dialog` 的内容是懒渲染的，
      在 watch 里 nextTick 后取节点会撞上「弹窗还没渲染完」的时序问题；
      模板绑定由 Vue 自己保证节点存在后才挂上，没有这个坑。
    -->
    <div class="sign-canvas-wrap">
      <canvas
        ref="canvasRef"
        class="sign-canvas"
        :width="CANVAS_W"
        :height="CANVAS_H"
        aria-label="签名区域，按住拖动书写签名"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      ></canvas>
      <span v-if="!hasInk" class="sign-placeholder" aria-hidden="true">请在此处签名</span>
    </div>

    <template #footer>
      <div class="sign-footer">
        <el-button class="btn-clear" :disabled="!hasInk || submitting" @click="clearInk">
          清除重签
        </el-button>
        <div class="footer-right">
          <el-button :disabled="submitting" @click="visible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="!hasInk"
            @click="confirm"
          >
            确认
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 考前签名弹窗（契约 01 §S3 / 02 §8B.4，接口 04 §11.5）。
 *
 * <p>两个要点：
 * 1. **统一 Pointer Events**：触摸端用 `offsetX/offsetY` 会因滚动、CSS 缩放而偏移，
 *    必须用 `getBoundingClientRect()` 把 client 坐标换算成画布内部坐标
 *    （契约 02 §8B.7 风险表最后一行）。
 * 2. **判空**：没画任何笔画时「确认」禁用——避免学员误点交一张空白签名，
 *    后端拿到空白图也没法作为证据。
 *
 * <p>`stage` 复用同一组件：`pre` 考前 / `post` 考后（`advancedSettings.postExamSign=1`）。
 * 考后签名本期未接线，但参数先留着，接线时不用改组件。
 */
import { computed, ref } from 'vue'
import { toast } from '@/utils/toast'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** pre 考前 / post 考后，仅影响标题后缀 */
    stage?: 'pre' | 'post'
    /** 返回 true 表示外部已处理成功，组件据此关闭；返回 false/抛错则保持打开 */
    submit: (dataUrl: string) => Promise<boolean>
  }>(),
  { stage: 'pre' }
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

/** 原平台实测 472×266，截图逐像素测得 472×264；取截图值 */
const CANVAS_W = 472
const CANVAS_H = 264

const canvasRef = ref<HTMLCanvasElement | null>(null)
const hasInk = ref(false)
const submitting = ref(false)
/** 是否有未结束的笔画；用于区分「正在画」与「画完」 */
let drawing = false

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const title = computed(() => (props.stage === 'post' ? '考后签名' : '考前签名'))

/** 画布 2D 上下文；每次操作现取，避免缓存住旧的 canvas 引用 */
const ctx2d = (): CanvasRenderingContext2D | null => canvasRef.value?.getContext('2d') ?? null

/**
 * 按 CSS 尺寸设置画笔宽度。
 *
 * <p>画布 1:1 设置（width/height 属性 = CSS 像素），不需要乘以 devicePixelRatio：
 * 原平台同样是 1:1，签名图导出后按原始像素显示即可，放大反而会让线条过细。
 */
function initCanvas() {
  const ctx = ctx2d()
  if (!ctx) return
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#262626'
}

/** client 坐标 → 画布内部坐标（Pointer Events 统一的换算方式） */
function pointOf(event: PointerEvent): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  // 画布内部尺寸与 CSS 尺寸可能因缩放不等，按比例换算才不会偏移
  const scaleX = canvas.width / (rect.width || canvas.width)
  const scaleY = canvas.height / (rect.height || canvas.height)
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  }
}

function onPointerDown(event: PointerEvent) {
  const ctx = ctx2d()
  const canvas = canvasRef.value
  if (!ctx || !canvas) return
  // 捕获指针：笔画划出画布再划回来时仍连续，不会断成两笔
  canvas.setPointerCapture(event.pointerId)
  drawing = true
  const { x, y } = pointOf(event)
  ctx.beginPath()
  ctx.moveTo(x, y)
  // 单击也要留下一个点，否则「轻点一下」会被判定成没签
  ctx.lineTo(x, y)
  ctx.stroke()
  hasInk.value = true
  event.preventDefault()
}

function onPointerMove(event: PointerEvent) {
  if (!drawing) return
  const ctx = ctx2d()
  if (!ctx) return
  const { x, y } = pointOf(event)
  ctx.lineTo(x, y)
  ctx.stroke()
  event.preventDefault()
}

function onPointerUp(event: PointerEvent) {
  if (!drawing) return
  drawing = false
  const canvas = canvasRef.value
  if (canvas && canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }
}

function clearInk() {
  const ctx = ctx2d()
  const canvas = canvasRef.value
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  hasInk.value = false
  initCanvas()
}

/**
 * 导出 PNG dataURL。
 *
 * <p>用 dataURL 而不是 File 直接上传：外层拿到后自己决定先上传还是先转 Blob，
 * 组件不掺和上传细节（上传失败的重试由外层控制）。
 */
function exportDataUrl(): string {
  const canvas = canvasRef.value
  if (!canvas) return ''
  return canvas.toDataURL('image/png')
}

async function confirm() {
  if (!hasInk.value || submitting.value) return
  const dataUrl = exportDataUrl()
  if (!dataUrl) {
    toast.error('签名生成失败，请重试')
    return
  }
  submitting.value = true
  try {
    const ok = await props.submit(dataUrl)
    if (ok) {
      visible.value = false
    }
  } catch (e) {
    // 外层失败原因由 request.ts 拦截器统一提示，这里只保证弹窗不关、笔画不丢
    const message = e instanceof Error ? e.message : '签名提交失败'
    toast.error(message)
  } finally {
    submitting.value = false
  }
}

/** 关闭后清空：下次打开是空白画布，不会残留上一次的笔迹 */
function onClosed() {
  clearInk()
}

defineExpose({ clearInk, exportDataUrl, title })
</script>

<style scoped lang="scss">
/* 弹窗内部尺寸照原平台实测：白框 520 宽，内容左右内边距 24 */
.pre-exam-sign-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px 0;
    margin-right: 0;
  }

  :deep(.el-dialog__title) {
    font-size: 16px;
    line-height: 24px;
    font-weight: 500;
    color: #262626;
  }

  :deep(.el-dialog__body) {
    padding: 12px 24px 0;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px 20px;
  }
}

.sign-tip {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 22px;
  color: #595959;
}

.sign-canvas-wrap {
  position: relative;
  width: 472px;
  height: 264px;
  /* 原平台实测画布是纯色块、无描边（文档 §2「细边框」与截图不符，以截图为准） */
  background: #f2f2f2;
  border-radius: 2px;
  overflow: hidden;
}

.sign-canvas {
  display: block;
  width: 472px;
  height: 264px;
  /* 触摸端禁止浏览器接管手势，否则签名会变成页面滚动 */
  touch-action: none;
  cursor: crosshair;
}

.sign-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  line-height: 22px;
  color: #bfbfbf;
  pointer-events: none;
  user-select: none;
}

/* 底部：清除重签固定左侧，取消/确认靠右（照原平台截图布局） */
.sign-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-clear {
  /* 清除重签是次要操作，图标用内联 SVG，不额外引 icon 依赖 */
  color: #595959;
}
</style>
