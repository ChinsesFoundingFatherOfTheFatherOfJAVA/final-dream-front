<template>
  <teleport to="body">
    <div v-if="visible" class="drawer-overlay" @click.self="close">
      <aside class="role-drawer">
        <header>
          <h3>{{ role ? '编辑角色' : '创建角色' }}</h3>
          <button type="button" aria-label="关闭" @click="close">×</button>
        </header>

        <form @submit.prevent="submit">
          <label>
            <span>角色名称 <em>*</em></span>
            <input v-model.trim="form.name" type="text" maxlength="20" placeholder="请输入角色名称" />
            <small>{{ form.name.length }}/20</small>
          </label>
          <label>
            <span>角色说明</span>
            <textarea
              v-model="form.description"
              maxlength="500"
              placeholder="请输入角色说明"
            />
            <small>{{ form.description.length }}/500</small>
          </label>
          <label>
            <span>备注</span>
            <textarea v-model="form.remark" maxlength="500" placeholder="请输入备注" />
            <small>{{ form.remark.length }}/500</small>
          </label>
          <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

          <footer>
            <button type="button" class="plain" @click="close">取消</button>
            <button type="submit" class="primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { createRole, updateRole, type RoleDetail } from '@/api/sm'

const props = defineProps<{
  visible: boolean
  role: RoleDetail | null
}>()

const emit = defineEmits<{
  close: []
  saved: [roleId?: string]
}>()

const form = reactive({
  name: '',
  description: '',
  remark: ''
})
const submitting = ref(false)
const errorMsg = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.name = props.role?.name ?? ''
    form.description = props.role?.description ?? ''
    form.remark = props.role?.remark ?? ''
    errorMsg.value = ''
  }
)

async function submit() {
  if (!form.name.trim()) {
    errorMsg.value = '请输入角色名称'
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    if (props.role) {
      await updateRole(props.role.roleId, {
        name: form.name.trim(),
        description: form.description || undefined,
        remark: form.remark || undefined
      })
      emit('saved')
    } else {
      const result = await createRole({
        name: form.name.trim(),
        description: form.description || undefined,
        remark: form.remark || undefined
      })
      emit('saved', result.roleId)
    }
    close()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('close')
}
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 3400;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.36);
}

.role-drawer {
  width: min(450px, 100%);
  height: 100%;
  background: #fff;
  box-shadow: -16px 0 40px rgba(15, 23, 42, 0.13);

  > header {
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    border-bottom: 1px solid #eef0f5;

    h3 {
      margin: 0;
      color: #1f2937;
      font-size: 17px;
    }

    button {
      border: none;
      background: transparent;
      color: #8a92a5;
      font-size: 25px;
      cursor: pointer;
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 20px;
  }

  label {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 7px;

    > span {
      color: #4d5568;
      font-size: 13px;
      font-weight: 500;

      em {
        color: #d94a4a;
        font-style: normal;
      }
    }

    input,
    textarea {
      width: 100%;
      border: 1px solid #d9deea;
      border-radius: 7px;
      color: #253047;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;

      &:focus {
        border-color: #2e7cf6;
        box-shadow: 0 0 0 2px rgba(46, 124, 246, 0.1);
      }
    }

    input {
      height: 40px;
      padding: 0 12px;
    }

    textarea {
      min-height: 110px;
      padding: 10px 12px;
      resize: vertical;
    }

    small {
      align-self: flex-end;
      color: #9aa3b2;
      font-size: 11px;
    }
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;

    button {
      min-width: 82px;
      height: 38px;
      border-radius: 7px;
      font-size: 14px;
      cursor: pointer;

      &.plain {
        border: 1px solid #d9deea;
        background: #fff;
        color: #4d5568;
      }

      &.primary {
        border: none;
        background: #2e7cf6;
        color: #fff;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

.form-error {
  margin: 0;
  color: #d94a4a;
  font-size: 13px;
}
</style>
