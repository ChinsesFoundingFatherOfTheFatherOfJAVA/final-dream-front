<template>
  <el-dialog
    :model-value="visible"
    width="552px"
    :show-close="false"
    :close-on-click-modal="false"
    append-to-body
    @close="emit('close')"
  >
    <template #header>
      <span class="hide-dialog-title">确定隐藏此{{ targetType }}吗？</span>
    </template>
    <div class="dialog-body">
      <div class="warning-icon" aria-hidden="true">!</div>
      <div>
        <!-- 截图18 语义：⚠ 标题 + "已选择 xxx：名称" + "隐藏后对所有学员不可见" -->
        <p>已选择{{ targetType }}：{{ name || '--' }}</p>
        <p>隐藏后对所有学员不可见</p>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" class="danger" @click="emit('confirm')">确定</el-button>
    </template>
  </el-dialog>
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
.hide-dialog-title {
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
}

.dialog-body {
  display: flex;
  gap: 14px;
  padding: 8px 0 10px;

  p {
    margin: 0;
    color: var(--color-muted);
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
  background: var(--color-warning);
  color: var(--color-graphite);
  font-weight: 700;
}
</style>
