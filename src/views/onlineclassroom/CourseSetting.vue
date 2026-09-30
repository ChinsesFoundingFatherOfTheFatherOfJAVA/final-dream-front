<template>
  <div class="setting-page">
    <section class="setting-card">
      <header>
        <h2>学分设置</h2>
      </header>
      <label class="radio-line">
        <input v-model.number="form.creditMode" type="radio" :value="1" />
        <span>学完课程时发放所有课件的学分</span>
      </label>
      <p class="note">注：课程完成时统一结算，未完成的课件不发放学分。</p>
      <p class="note">注：后续如有新的学分发放规则，将在此基础上扩展。</p>
    </section>

    <section class="setting-card">
      <header>
        <h2>防挂机设置</h2>
        <label class="switch-line">
          <input v-model="antiIdleEnabled" type="checkbox" />
          <span>开启防挂机功能</span>
        </label>
      </header>

      <label class="mode-line">
        <input v-model.number="form.antiIdleMode" type="radio" :value="1" :disabled="!antiIdleEnabled" />
        <span>系统在</span>
        <input v-model.number="form.checkIntervalMinutes" type="number" min="1" max="60" :disabled="!antiIdleEnabled" />
        <span>分钟确认学员是否在线，如不在线则停止播放</span>
      </label>

      <label class="mode-line">
        <input v-model.number="form.antiIdleMode" type="radio" :value="2" :disabled="!antiIdleEnabled" />
        <span>系统在</span>
        <input v-model.number="form.checkIntervalMinutes" type="number" min="1" max="60" :disabled="!antiIdleEnabled" />
        <span>分钟确认学员是否在线，学员需要在</span>
        <input v-model.number="form.confirmSeconds" type="number" min="30" max="600" :disabled="!antiIdleEnabled || form.antiIdleMode !== 2" />
        <span>秒内点击确认，如未确认本次学习无效</span>
      </label>

      <label class="prompt-field">
        <span>确认学员是否在线提示语</span>
        <textarea
          v-model="form.promptText"
          maxlength="250"
          rows="4"
          :disabled="!antiIdleEnabled"
          placeholder="请输入提示语"
        ></textarea>
        <small>{{ form.promptText.length }}/250</small>
      </label>
    </section>

    <div class="form-actions">
      <button type="button" class="apply-btn" :disabled="saving" @click="save">
        {{ saving ? '保存中...' : '应用' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getKngSetting, updateKngSetting, type KngSetting } from '@/api/kng'
import { toast } from '@/utils/toast'

const form = reactive<KngSetting>({
  creditMode: 1,
  antiIdleEnabled: false,
  antiIdleMode: 1,
  checkIntervalMinutes: 3,
  confirmSeconds: 120,
  promptText: '已触发防挂机验证，请点击"继续学习"，否则学习将被停止'
})
const saving = ref(false)
const antiIdleEnabled = computed({
  get: () => form.antiIdleEnabled,
  set: value => { form.antiIdleEnabled = value }
})

const load = async () => {
  const data = await getKngSetting()
  if (data) Object.assign(form, data)
}

const save = async () => {
  saving.value = true
  try {
    await updateKngSetting({ ...form })
    toast.info('已保存')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.setting-page {
  max-width: 980px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-card {
  padding: 20px 22px;
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fff;

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  h2 {
    margin: 0;
    color: #253047;
    font-size: 16px;
  }
}

.radio-line,
.switch-line,
.mode-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4d5568;
  font-size: 14px;
}

.note {
  margin: 10px 0 0 24px;
  color: #98a1b2;
  font-size: 12px;
}

.mode-line {
  margin-top: 14px;
  flex-wrap: wrap;

  input[type='number'] {
    width: 72px;
    height: 34px;
    padding: 0 8px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    outline: none;
  }
}

.prompt-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  color: #4d5568;
  font-size: 14px;

  textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    resize: vertical;
    outline: none;
    font-family: inherit;
  }

  small {
    align-self: flex-end;
    color: #98a1b2;
    font-size: 12px;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.apply-btn {
  height: 38px;
  padding: 0 26px;
  border: none;
  border-radius: 6px;
  background: #e75487;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
