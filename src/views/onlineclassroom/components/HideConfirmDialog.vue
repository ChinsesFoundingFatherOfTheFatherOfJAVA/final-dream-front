<template>
  <teleport to="body">
    <div v-if="visible" class="hide-dialog-mask" @click.self="emit('close')">
      <section class="hide-dialog">
        <div class="dialog-body">
          <div class="warning-icon">!</div>
          <div>
            <!-- 截图18 语义：⚠ 标题 + "已选择 xxx：名称" + "隐藏后对所有学员不可见" -->
            <h3>确定隐藏此{{ targetType }}吗？</h3>
            <p>已选择{{ targetType }}：{{ name || '--' }}</p>
            <p>隐藏后对所有学员不可见</p>
          </div>
        </div>
        <footer>
          <el-button @click="emit('close')">取消</el-button>
          <el-button class="danger" @click="emit('confirm')">确定</el-button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup lang="ts">
/**
 * 隐藏确认弹窗（课程管理截图18 同款语义，课件管理增补A/课程模块/设计器任务共用）。
 * 隐藏与下架为独立双标记：确认后仅置 hidden 标记，行置灰 + "已隐藏"标签，可再次取消隐藏。
 */
const props = withDefaults(defineProps<{
  visible: boolean
  /** 目标名词：课件 / 课程 / 任务（用于拼标题与正文） */
  targetType?: string
  /** 被隐藏对象名称 */
  name?: string
}>(), {
  targetType: '课件',
  name: ''
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()

// props 仅模板使用，占位避免未使用告警
void props
</script>

<style scoped lang="scss">
.hide-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.34);
}

.hide-dialog {
  width: 552px;
  max-width: calc(100vw - 32px);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18);
}

.dialog-body {
  display: flex;
  gap: 14px;
  padding: 44px 40px 34px;

  h3 {
    margin: 0 0 12px;
    color: #30384a;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: #6f788a;
    font-size: 13px;
    line-height: 1.7;
  }
}

.warning-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f59f2f;
  color: #fff;
  font-weight: 700;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 40px 22px;

  button {
    height: 36px;
    padding: 0 18px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    cursor: pointer;

    &.danger {
      border-color: #2e7cf6;
      background: #2e7cf6;
      color: #fff;
    }
  }
}
</style>
