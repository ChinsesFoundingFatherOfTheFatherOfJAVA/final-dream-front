<template>
  <el-dialog
    v-model="visible"
    title="录入人脸照片（选填）"
    width="480px"
    class="face-baseline-dialog"
    :close-on-click-modal="false"
    align-center
    @closed="teardown"
  >
    <!-- ===== 取景 / 已拍到 ===== -->
    <template v-if="phase !== 'done'">
      <div class="camera-box">
        <video
          v-show="!shot"
          ref="videoRef"
          class="camera-video"
          autoplay
          playsinline
          muted
          aria-label="摄像头预览"
        ></video>
        <img
          v-if="shot"
          :src="shot"
          class="camera-video shot-preview"
          alt="已拍摄的人脸照片"
        />
        <div v-if="phase === 'opening'" class="camera-mask">正在打开摄像头…</div>
        <div v-else-if="phase === 'uploading'" class="camera-mask">正在保存…</div>
      </div>

      <!--
        文案必须说清「为什么」和「不做会怎样」。
        学员在考试页突然被要求拍照，不给理由会以为是病毒或强制采集。
      -->
      <p class="face-tip">
        {{ shot ? '确认照片里是本人、面部清晰，再点「使用这张」。' : '请正对摄像头，让面部完整出现在画面中。' }}
      </p>
      <p class="face-note">
        <span aria-hidden="true">ⓘ</span>
        这张照片仅用于考试时比对「是不是同一个人」，<b>不会</b>用于其他用途。
        你随时可以重录，也可以跳过。
      </p>
    </template>

    <!-- ===== 完成 ===== -->
    <template v-else>
      <div class="result-block">
        <div class="result-icon is-ok" aria-hidden="true">✓</div>
        <p class="result-title">照片已保存</p>
        <p class="result-desc">下次进入考试时会用它核对身份。</p>
      </div>
    </template>

    <template #footer>
      <div class="dialog-footer">
        <!-- 跳过入口始终存在：录入是选填，不能变成变相强制 -->
        <el-button v-if="phase !== 'done'" text @click="skip">以后再说</el-button>        <div class="footer-right">
          <template v-if="phase === 'done'">
            <el-button type="primary" @click="close">好</el-button>
          </template>
          <template v-else-if="shot">
            <el-button :disabled="busy" @click="retake">重新拍</el-button>
            <el-button type="primary" :loading="busy" @click="confirmShot">使用这张</el-button>
          </template>
          <template v-else>
            <el-button type="primary" :loading="phase === 'opening'" :disabled="!ready" @click="takeShot">
              拍照
            </el-button>
          </template>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 人脸基准照录入弹窗（2026-11-12，DER-33）。
 *
 * <p>**与 FaceVerifyDialog 的区别**：这里只拍照存档，**不做活体动作判定**。
 * 录入阶段要求学员眨眼/转头没有意义——防的是"拿照片冒充"，而录入本来就是他本人
 * 在给自己建档；真正的活体判定发生在考试前那一刻。
 *
 * <p>**不强制**（用户 2026-11-12 拍板）：强制采集人脸在多数场景需要单独告知与同意，
 * 且设备/隐私条件不具备时会把正常学员挡在门外。所以「以后再说」始终可见。
 *
 * <p>**能力边界（DEF-01）**：这张照片是学员自己拍的，首次就可以是别人。
 * 它只能用于检测「这次与上次不是同一人」，**不是身份认证**。UI 文案不得暗示"已确认本人"。
 */
import { ref, watch } from 'vue'
import { toast } from '@/utils/toast'
import { uploadExamFile } from '@/api/exam'
import { saveFaceBaseline } from '@/api/studentExam'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 保存成功（true）或跳过后关闭（false），外层据此决定是否再提示 */
  done: [saved: boolean]
}>()

type Phase = 'idle' | 'opening' | 'ready' | 'uploading' | 'done'

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (visible.value = v)
)
watch(visible, (v) => {
  emit('update:modelValue', v)
})

const phase = ref<Phase>('idle')
const videoRef = ref<HTMLVideoElement | null>(null)
const shot = ref<string | null>(null)
const busy = ref(false)
const ready = ref(false)

let stream: MediaStream | null = null

/** 打开摄像头。失败不阻断——直接提示并可跳过 */
async function openCamera() {
  phase.value = 'opening'
  ready.value = false
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头')
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    })
    const video = videoRef.value
    if (!video) return
    video.srcObject = stream
    await video.play()
    phase.value = 'ready'
    ready.value = true
  } catch (e) {
    phase.value = 'idle'
    ready.value = false
    const text = e instanceof Error ? e.message : '无法打开摄像头'
    toast.error(`${text}。可以先跳过，不影响参加考试`)
  }
}

/**
 * 抓一帧成 JPEG dataURL。
 *
 * <p>**不做任何翻转**：`<video>` 上的 `scaleX(-1)` 只是 CSS 显示效果，
 * 不影响 `drawImage` 读到的像素——读到的本来就是真实朝向。
 * 若在画布上再翻一次，存下来的就会是镜像脸，后续比对反而对不上。
 *
 * <p>预览 `<img>` 之所以也不镜像（见 `.shot-preview`），是要让学员看到
 * 「实际存下来的样子」——如果预览镜像而存储不镜像，学员会觉得"拍出来反了"。
 */
function grab(): string | null {
  const video = videoRef.value
  if (!video || !video.videoWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}

function takeShot() {
  const dataUrl = grab()
  if (!dataUrl) {
    toast.error('拍照失败，请重试')
    return
  }
  shot.value = dataUrl
  // 拍完立刻停流：既省电也让摄像头指示灯灭掉，学员能确认真的关了
  stopStream()
}

function retake() {
  shot.value = null
  void openCamera()
}

async function confirmShot() {
  const dataUrl = shot.value
  if (!dataUrl || busy.value) return
  busy.value = true
  phase.value = 'uploading'
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `face-baseline-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const uploaded = await uploadExamFile(file)
    // 存原样 `/api/exam/files/...`：这是要落库的证据地址，
    // 不能用 normalizeExamFileUrl 去掉 `/api`（那是给 <img src> 用的）
    const fileUrl = uploaded?.fileUrl
    if (!fileUrl) throw new Error('上传失败，请重试')
    await saveFaceBaseline(fileUrl)
    phase.value = 'done'
    emit('done', true)
  } catch (e) {
    phase.value = 'ready'
    toast.error(e instanceof Error ? e.message : '保存失败，请重试')
  } finally {
    busy.value = false
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
}

/** 跳过：明确记一次「未录入」，外层不再反复骚扰 */
function skip() {
  emit('done', false)
  visible.value = false
}

function close() {
  visible.value = false
}

/** 关闭/卸载时释放摄像头，避免指示灯长亮 */
function teardown() {
  stopStream()
  shot.value = null
  phase.value = 'idle'
  ready.value = false
}

watch(visible, (v) => {
  if (v) {
    shot.value = null
    phase.value = 'idle'
    void openCamera()
  }
})
</script>

<style scoped lang="scss">
.camera-box {
  position: relative;
  width: 100%;
  height: 300px;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 镜像预览：自拍时人习惯看到"照镜子"的自己，不镜像会觉得左右反了 */
  transform: scaleX(-1);
}

/*
 * 已拍照片不镜像：`grab()` 读到的本来就是真实朝向（CSS 的 scaleX 不影响像素），
 * 让学员看到的就是实际存下来的样子，避免"预览和存档相反"的困惑。
 */
.shot-preview {
  transform: none;
}

.camera-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
}

.face-tip {
  margin: 12px 0 4px;
  font-size: 14px;
  color: #262626;
}

.face-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #8c8c8c;
}

.result-block {
  padding: 32px 0;
  text-align: center;
}

.result-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;

  &.is-ok {
    background: #f6ffed;
    color: #52c41a;
  }
}

.result-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.result-desc {
  margin: 0;
  font-size: 13px;
  color: #8c8c8c;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
