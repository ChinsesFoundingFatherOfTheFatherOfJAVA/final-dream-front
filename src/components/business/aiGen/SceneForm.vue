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
        class="form-textarea tall"
        :disabled="generating"
      />
      <div class="char-count">{{ local.scene.length }}/500</div>
    </div>
    <div class="form-item">
      <label class="form-label required">陪练角色</label>
      <el-input class="form-input" v-model="local.trainerRole" maxlength="20" :disabled="generating" />
      <div class="char-count">{{ local.trainerRole.length }}/20</div>
    </div>
    <div class="form-item">
      <label class="form-label required">角色画像</label>
      <el-input
        v-model="local.trainerProfile"
        type="textarea"
        :rows="3"
        maxlength="200"
        class="form-textarea"
        :disabled="generating"
      />
      <div class="char-count">{{ local.trainerProfile.length }}/200</div>
    </div>
    <div class="form-item">
      <label class="form-label required">学员角色</label>
      <el-input class="form-input" v-model="local.studentRole" maxlength="20" :disabled="generating" />
      <div class="char-count">{{ local.studentRole.length }}/20</div>
    </div>
    <div class="form-item">
      <label class="form-label required">对话目标</label>
      <el-input
        v-model="local.goal"
        type="textarea"
        :rows="4"
        maxlength="500"
        class="form-textarea"
        :disabled="generating"
      />
      <div class="char-count">{{ local.goal.length }}/500</div>
    </div>

    <div class="footer-btns">
      <el-button class="btn-gradient" :disabled="generating" @click="emit('next')">
        ✨ 确认无误，生成对话大纲
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
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

  .form-input, .form-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: #6b5ce7; }
  }

  .form-textarea { resize: vertical; min-height: 64px; &.tall { min-height: 96px; } }
  .char-count { text-align: right; font-size: 12px; color: #999; margin-top: 3px; }
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
</style>
