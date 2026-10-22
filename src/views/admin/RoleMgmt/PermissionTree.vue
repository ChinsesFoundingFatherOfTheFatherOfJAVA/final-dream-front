<template>
  <div class="permission-tree">
    <section v-for="group in permissions" :key="group.permissionId" class="permission-group">
      <div class="group-title">{{ group.name }}</div>
      <el-checkbox
        v-for="permission in group.children"
        :key="permission.permissionId"
        class="permission-row"
        :model-value="modelValue.includes(permission.code)"
          :disabled="disabled"
        @change="toggle(permission, Boolean($event))"
      >
        {{ permission.name }}
      </el-checkbox>
      <el-empty v-if="!group.children.length" description="暂无权限项" :image-size="48" />
    </section>
    <el-empty v-if="!permissions.length" class="empty-tree" description="暂无权限数据" :image-size="64" />
  </div>
</template>

<script setup lang="ts">
import type { PermissionNode } from '@/api/sm'

defineProps<{
  permissions: PermissionNode[]
  modelValue: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  toggle: [permission: PermissionNode, checked: boolean]
}>()

function toggle(permission: PermissionNode, checked: boolean) {
  emit('toggle', permission, checked)
}
</script>

<style scoped lang="scss">
.permission-tree {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.permission-group {
  padding: 14px;
  border: 1px solid #e9edf4;
  border-radius: 7px;
  background: #fafbfd;
}

.group-title {
  margin-bottom: 10px;
  color: #253047;
  font-size: 14px;
  font-weight: 600;
}

.permission-row {
  min-height: 34px;
  padding: 0 4px;
  border-radius: 5px;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #f3f7ff;
  }

  :deep(.el-checkbox__label) {
    color: #4d5568;
    font-size: 13px;
  }
}

.empty-tree {
  color: #9aa3b2;
  font-size: 13px;
}

.empty-tree {
  grid-column: 1 / -1;
  padding: 12px 0;
}

.permission-group :deep(.el-empty) {
  padding: 8px 0;
}

@media (max-width: 860px) {
  .permission-tree {
    grid-template-columns: 1fr;
  }
}
</style>
