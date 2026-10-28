<template>
  <!-- SG-04 右半区场景五字段表单（AI 生成后可编辑） -->
  <div class="scene-form">
    <div class="form-item">
      <label class="form-label required">对话场景</label>
      <el-input
        v-model="local.scene"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        class="form-textarea tall"
        :disabled="generating"
      />
    </div>
    <div class="form-item">
      <label class="form-label required">陪练角色</label>
      <el-input class="form-input" v-model="local.trainerRole" maxlength="20" show-word-limit :disabled="generating" />
    </div>
    <div class="form-item">
      <label class="form-label required">角色画像</label>
      <el-input
        v-model="local.trainerProfile"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        class="form-textarea"
        :disabled="generating"
      />
    </div>
    <div class="form-item">
      <label class="form-label required">学员角色</label>
      <el-input class="form-input" v-model="local.studentRole" maxlength="20" show-word-limit :disabled="generating" />
    </div>
    <div class="form-item">
      <label class="form-label required">对话目标</label>
      <el-input
        v-model="local.goal"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        class="form-textarea"
        :disabled="generating"
      />
    </div>

    <div class="footer-btns">
      <el-button class="btn-gradient" :disabled="generating" @click="emit('next')">
        <el-icon class="btn-caret"><MagicStick /></el-icon> 确认无误，生成对话大纲
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagicStick } from '@element-plus/icons-vue'
import { computed } from 'vue'
import type { SceneData } from '@/api/aiGen'

/** 场景五字段编辑表单（SG-04）：字段改动直接反映到父级（进入第二步传改后值）。 */
const props = defineProps<{ scene: SceneData; generating: boolean }>()

const emit = defineEmits<{
  'update:scene': [value: SceneData]
  next: []
}>()

const local = computed({
  get: () => props.scene,
  set: (v) => emit('update:scene', v)
})
</script>

<style scoped lang="scss">
.scene-form {
  display: flex;
  flex-direction: column;
  gap: 14px;

  .form-label {
    display: block;
    font-size: 13px;
    color: #333;
    margin-bottom: 6px;
    font-weight: 500;

    &.required::after { content: ' *'; color: #f5222d; }
  }

  /* 边框只留在 EP wrapper，避免根节点 border 和内层 inset 描边套盒。 */
  .form-input, .form-textarea {
    width: 100%;
  }

  .form-input :deep(.el-input__wrapper),
  .form-textarea :deep(.el-textarea__inner) {
    border-radius: 6px;
    box-shadow: 0 0 0 1px #d9d9d9 inset;
    font-family: inherit;
  }

  .form-input :deep(.el-input__wrapper.is-focus),
  .form-textarea :deep(.el-textarea__inner:focus) {
    box-shadow: 0 0 0 1px #6b5ce7 inset;
  }

  .form-textarea.tall :deep(.el-textarea__inner) { min-height: 96px; }
}

.footer-btns { margin-top: auto; padding-top: 10px; }

.btn-gradient {
  width: 100%;
  padding: 10px 0;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #8f7bff, #6b5ce7);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { opacity: 0.92; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.btn-caret { vertical-align: -2px; margin-left: 2px; font-size: 12px; }
</style>
