<template>
  <teleport to="body">
    <transition name="tip-fade">
      <div v-if="visible" class="tip-overlay" @click.self="close">
        <!-- FP-12 要点提示弹窗（照抄原平台） -->
        <div class="tip-modal">
          <span class="close-icon" @click="close">×</span>
          <p class="tip-text">这个说法貌似不太管用，推荐你按照如下要点沟通，试试看可能会更有效哦～</p>
          <!-- 无要点时不渲染粉底盒子：否则弹窗只剩一句"推荐你按照如下要点沟通"+ 一块空白 -->
          <div v-if="keyPoints.length" class="points-box">
            <p v-for="(point, index) in keyPoints" :key="index" class="point-item">
              {{ index + 1 }}、{{ point }}
            </p>
          </div>
          <button class="know-btn" @click="close">知道了</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  keyPoints: string[]
}>()

const emit = defineEmits<{ close: [] }>()

const close = () => emit('close')
</script>

<style scoped lang="scss">
.tip-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  /* 仅在对话区上方居中：遮罩限制在视口中偏中间区域，弱化不挡左右栏 */
  background: rgba(10, 10, 20, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip-modal {
  position: relative;
  width: 400px;
  max-width: calc(100vw - 48px);
  background: #fff;
  border-radius: 16px;
  padding: 30px 28px 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  text-align: center;

  .close-icon {
    position: absolute;
    top: 12px;
    right: 16px;
    font-size: 20px;
    color: #bbb;
    cursor: pointer;
    line-height: 1;

    &:hover {
      color: #666;
    }
  }

  .tip-text {
    font-size: 15px;
    color: #333;
    line-height: 1.7;
    margin: 0 0 16px;
    text-align: left;
  }

  .points-box {
    background: #fff1f0;
    border-radius: 10px;
    padding: 14px 18px;
    text-align: left;
    margin-bottom: 22px;

    .point-item {
      font-size: 14px;
      color: #333;
      line-height: 1.9;
      margin: 0;
    }
  }

  .know-btn {
    width: 100%;
    height: 42px;
    border: none;
    border-radius: 21px;
    background: linear-gradient(90deg, #7a6cf0 0%, #4a7dff 100%);
    color: #fff;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.92;
    }
  }
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.18s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  opacity: 0;
}
</style>
