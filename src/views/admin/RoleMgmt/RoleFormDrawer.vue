<template>
  <el-drawer
    :model-value="visible"
    :title="role ? '编辑角色' : '创建角色'"
    size="450px"
    append-to-body
    destroy-on-close
    @update:model-value="handleVisibleChange"
  >
    <el-form class="role-form" label-position="top" @submit.prevent="submit">
      <el-form-item label="角色名称" required>
        <el-input
          v-model.trim="form.name"
          maxlength="20"
          show-word-limit
          placeholder="请输入角色名称"
          @keyup.enter="submit"
        />
      </el-form-item>
      <el-form-item label="角色说明">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="请输入角色说明"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="请输入备注"
        />
      </el-form-item>
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" :closable="false" show-icon />
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
    </template>
  </el-drawer>
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

function handleVisibleChange(visible: boolean) {
  if (!visible) close()
}
</script>

<style scoped lang="scss">
.role-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 7px;
    color: var(--color-ink-2);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
  }

  :deep(.el-textarea__inner),
  :deep(.el-input__wrapper) {
    border-radius: 7px;
  }
}
</style>
