<template>
  <el-dialog
    v-if="visible"
    :model-value="visible"
    width="400px"
    :show-close="false"
    append-to-body
    class="tip-dialog"
    @close="close"
  >
    <!-- FP-12 要点提示弹窗（照抄原平台） -->
    <div class="tip-modal">
      <span
        class="close-icon"
        role="button"
        tabindex="0"
        aria-label="关闭"
        @click="close"
        @keydown.enter.prevent="close"
      >×</span>
      <p class="tip-text">这个说法貌似不太管用，推荐你按照如下要点沟通，试试看可能会更有效哦～</p>
      <!-- 无要点时不渲染粉底盒子：否则弹窗只剩一句"推荐你按照如下要点沟通"+ 一块空白 -->
      <div v-if="keyPoints.length" class="points-box">
        <p v-for="(point, index) in keyPoints" :key="index" class="point-item">
          {{ index + 1 }}、{{ point }}
        </p>
      </div>
      <el-button class="know-btn" @click="close">知道了</el-button>
    </div>
  </el-dialog>
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
.tip-dialog {
  :deep(.el-dialog__header) {
    display: none;
  }
}

.tip-modal {
  position: relative;
  padding: 4px;
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

    // 图标关闭按钮：补键盘焦点环
    &:focus-visible {
      outline: 2px solid #7a6cf0;
      outline-offset: 2px;
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
</style>
