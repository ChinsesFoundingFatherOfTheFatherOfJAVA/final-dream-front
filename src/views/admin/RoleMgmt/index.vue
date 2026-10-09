<template>
  <div class="role-page">
    <aside class="role-list-panel">
      <div class="list-header">
        <h2>角色列表</h2>
        <button type="button" @click="openCreate">创建</button>
      </div>
      <label class="role-search">
        <span class="sr-only">搜索角色</span>
        <input v-model.trim="keyword" type="search" placeholder="搜索角色名称" />
      </label>
      <div class="role-list">
        <button
          v-for="role in filteredRoles"
          :key="role.roleId"
          type="button"
          class="role-item"
          :class="{ active: currentRole?.roleId === role.roleId }"
          @click="selectRole(role.roleId)"
        >
          <span>{{ role.name }}</span>
          <em>{{ role.userCount }} 人</em>
        </button>
        <p v-if="!filteredRoles.length">暂无角色</p>
      </div>
    </aside>

    <section class="role-detail-panel">
      <template v-if="currentRole">
        <header class="detail-header">
          <div>
            <h2>{{ currentRole.name }}</h2>
            <p>{{ currentRole.userCount }} 人</p>
          </div>
          <div class="header-actions">
            <button type="button" class="link-action" @click="goToMembers">角色人员管理</button>
            <button type="button" @click="openEdit">编辑</button>
            <button type="button" class="danger" @click="handleDelete">删除</button>
          </div>
        </header>

        <div class="meta-grid">
          <div>
            <span>创建人</span>
            <strong>{{ currentRole.createdByName || valueOrDash(currentRole.createdBy) }}</strong>
          </div>
          <div>
            <span>创建时间</span>
            <strong>{{ valueOrDash(currentRole.createdAt) }}</strong>
          </div>
        </div>

        <section class="description-block">
          <h3>角色描述</h3>
          <p>{{ valueOrDash(currentRole.description) }}</p>
        </section>

        <section class="remark-block">
          <h3>备注</h3>
          <p>{{ valueOrDash(currentRole.remark) }}</p>
        </section>

        <section class="permission-block">
          <div class="section-title">
            <h3>功能权限</h3>
            <span>勾选后即时保存</span>
          </div>
          <PermissionTree
            :permissions="permissionTree"
            :model-value="currentRole.permissionCodes"
            :disabled="permissionSaving"
            @toggle="togglePermission"
          />
        </section>
      </template>

      <div v-else class="empty-detail">
        {{ loading ? '正在加载...' : '请选择或创建一个角色' }}
      </div>
    </section>

    <RoleFormDrawer
      :visible="formVisible"
      :role="editingRole"
      @close="formVisible = false"
      @saved="handleRoleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { confirmDialog } from '@/utils/confirmDialog'
import { useRouter } from 'vue-router'
import {
  addRolePermission,
  deleteRole,
  getPermissionTree,
  getRoleDetail,
  getRoles,
  removeRolePermission,
  type PermissionNode,
  type RoleDetail,
  type RoleSummary
} from '@/api/sm'
import { toast } from '@/utils/toast'
import PermissionTree from './PermissionTree.vue'
import RoleFormDrawer from './RoleFormDrawer.vue'

const router = useRouter()
const roles = ref<RoleSummary[]>([])
const currentRole = ref<RoleDetail | null>(null)
const permissionTree = ref<PermissionNode[]>([])
const keyword = ref('')
const loading = ref(false)
const permissionSaving = ref(false)
const formVisible = ref(false)
const editingRole = ref<RoleDetail | null>(null)

const filteredRoles = computed(() => {
  const needle = keyword.value.trim()
  return needle ? roles.value.filter((role) => role.name.includes(needle)) : roles.value
})

const valueOrDash = (value: unknown) => {
  const text = value == null ? '' : String(value).trim()
  return text || '-'
}

async function loadRoles() {
  const result = await getRoles()
  roles.value = result.list ?? []
}

async function loadRoleDetail(roleId: string) {
  currentRole.value = await getRoleDetail(roleId)
}

async function selectRole(roleId: string) {
  await loadRoleDetail(roleId)
}

function openCreate() {
  editingRole.value = null
  formVisible.value = true
}

function openEdit() {
  if (!currentRole.value) return
  editingRole.value = currentRole.value
  formVisible.value = true
}

async function handleRoleSaved(roleId?: string) {
  await loadRoles()
  const targetId = roleId || currentRole.value?.roleId || roles.value[0]?.roleId
  if (targetId) await loadRoleDetail(targetId)
}

async function handleDelete() {
  const role = currentRole.value
  if (!role) return
  if (role.userCount > 0) {
    toast.warn(`该角色下仍有 ${role.userCount} 名用户，请先取消全部授权`)
    return
  }
  if (!(await confirmDialog({ message: `确认删除角色“${role.name}”？`, danger: true }))) return
  try {
    await deleteRole(role.roleId)
    await loadRoles()
    currentRole.value = roles.value[0] ? await getRoleDetail(roles.value[0].roleId) : null
    toast.info('角色已删除')
  } catch {
    // request.ts 已展示错误。
  }
}

async function togglePermission(permission: PermissionNode, checked: boolean) {
  const role = currentRole.value
  if (!role || permissionSaving.value) return
  const previous = [...role.permissionCodes]
  role.permissionCodes = checked
    ? Array.from(new Set([...role.permissionCodes, permission.code]))
    : role.permissionCodes.filter((code) => code !== permission.code)
  permissionSaving.value = true
  try {
    if (checked) {
      await addRolePermission(role.roleId, permission.permissionId)
    } else {
      await removeRolePermission(role.roleId, permission.permissionId)
    }
  } catch {
    role.permissionCodes = previous
  } finally {
    permissionSaving.value = false
  }
}

function goToMembers() {
  if (!currentRole.value) return
  void router.push(`/enterprise/roles/users/${currentRole.value.roleId}`)
}

onMounted(async () => {
  loading.value = true
  try {
    const permissionResult = await getPermissionTree()
    permissionTree.value = permissionResult.list ?? []
    await loadRoles()
    if (roles.value[0]) await loadRoleDetail(roles.value[0].roleId)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.role-page {
  min-height: 560px;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 14px;
}

.role-list-panel,
.role-detail-panel {
  min-width: 0;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;
}

.role-list-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #eef0f5;

  h2 {
    margin: 0;
    color: #1f2937;
    font-size: 16px;
  }

  button {
    height: 32px;
    padding: 0 13px;
    border: none;
    border-radius: 6px;
    background: #2e7cf6;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
  }
}

.role-search {
  padding: 12px 14px 8px;

  input {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    color: #374151;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: #2e7cf6;
    }
  }
}

.role-list {
  flex: 1;
  min-height: 0;
  padding: 4px 10px 12px;
  overflow-y: auto;

  > p {
    padding: 36px 0;
    text-align: center;
    color: #9aa3b2;
    font-size: 13px;
  }
}

.role-item {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #4d5568;
  font-size: 14px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: #f5f8fd;
  }

  &.active {
    background: #eaf2ff;
    color: #1f6fe8;
    font-weight: 600;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    flex: 0 0 auto;
    color: #98a0ad;
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
  }
}

.role-detail-panel {
  padding: 18px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f5;

  h2 {
    margin: 0 0 5px;
    color: #1f2937;
    font-size: 20px;
  }

  p {
    margin: 0;
    color: #7b8494;
    font-size: 13px;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  button {
    height: 32px;
    padding: 0 12px;
    border: 1px solid #d7dce5;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    font-size: 13px;
    cursor: pointer;

    &.link-action {
      border-color: #bcd4ff;
      color: #2e7cf6;
      background: #f5f9ff;
    }

    &.danger {
      border-color: #f0c9c9;
      color: #d94a4a;
      background: #fffafa;
    }
  }
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 0;

  > div {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  span {
    color: #8a92a5;
    font-size: 12px;
  }

  strong {
    color: #394253;
    font-size: 14px;
    font-weight: 500;
  }
}

.description-block,
.remark-block,
.permission-block {
  margin-top: 12px;

  h3 {
    margin: 0 0 8px;
    color: #253047;
    font-size: 14px;
  }

  p {
    margin: 0;
    color: #596274;
    font-size: 13px;
    line-height: 1.8;
    white-space: pre-wrap;
  }
}

.permission-block {
  margin-top: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span {
    color: #98a0ad;
    font-size: 12px;
  }
}

.empty-detail {
  height: 100%;
  min-height: 380px;
  display: grid;
  place-items: center;
  color: #9aa3b2;
  font-size: 14px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 980px) {
  .role-page {
    grid-template-columns: 1fr;
  }

  .role-list-panel {
    max-height: 360px;
  }
}

@media (max-width: 680px) {
  .detail-header {
    flex-direction: column;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
