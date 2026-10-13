<template>
  <!-- FP-03 新建/编辑分类抽屉（截图03/06） -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>{{ mode === 'create' ? '新建题库分类' : '编辑题库分类' }}</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <!-- 面包屑（截图03：所属分类 → xxx） -->
        <div class="breadcrumb">
          <span class="crumb-label">所属分类</span>
          <span>› {{ mode === 'create' ? parentName : detail?.parentName }}</span>
        </div>

        <!-- 编辑态只读信息（截图06） -->
        <div v-if="mode === 'edit'" class="readonly-info">
          <div class="info-row"><span>所属分类</span><span>{{ detail?.parentName }}</span></div>
          <div class="info-row"><span>题库数量</span><span>{{ detail?.libQty }}</span></div>
          <div class="info-row"><span>创建时间</span><span>{{ detail?.createTime }}</span></div>
          <div class="info-row"><span>创建者</span><span>{{ detail?.createFullname }}</span></div>
        </div>

        <!-- 基本信息（蓝色竖条节标题，截图03） -->
        <div class="section">
          <div class="section-title">基本信息</div>
          <div class="form-item">
            <label class="form-label required">分类名称</label>
            <textarea
              v-if="mode === 'create'"
              v-model="catalogText"
              rows="6"
              maxlength="10000"
              placeholder="示例：&#10;分类名称1&#10;  子分类名称01&#10;    子分类名称001&#10;分类名称2"
            ></textarea>
            <input v-else v-model="editName" maxlength="200" class="name-input" />
          </div>
          <div v-if="mode === 'create'" class="fill-notice">
            <p>填写须知：</p>
            <p>1、分类体系最多支持10级</p>
            <p>2、一个分类一行，一次最多批量创建50个分类</p>
            <p>3、每级子分类需与上级分类保持一个以上空格的缩进</p>
            <p>4、分类名称200字以内</p>
          </div>
        </div>

        <!-- 权限设置（截图03） -->
        <div class="section">
          <div class="section-title">权限设置</div>
          <div class="form-item">
            <label class="form-label">添加管理员</label>
            <div class="admin-picker" @click="showUserPicker = true">
              <template v-if="adminUsers.length">
                <span v-for="u in adminUsers" :key="u.userId" class="admin-tag">
                  {{ u.fullname || u.userId }}
                  <i class="tag-close" @click.stop="removeAdmin(u.userId)">×</i>
                </span>
              </template>
              <span v-else class="admin-placeholder">请选择</span>
              <span class="picker-btn">···</span>
            </div>
          </div>
          <label class="checkbox-item">
            <input type="checkbox" v-model="inheritParentAuth" :disabled="inheritLocked" />
            <span>继承一级分类权限</span>
          </label>
          <p class="checkbox-note">勾选后使用一级分类权限覆盖当前分类权限，不允许修改</p>
          <label class="checkbox-item">
            <input type="checkbox" v-model="childInheritCurrentAuth" />
            <span>所有子分类继承当前分类权限</span>
          </label>
          <p class="checkbox-note">勾选后所有子分类权限将被当前分类覆盖，不允许修改</p>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '确定' }}
        </button>
      </div>
    </div>

    <!-- 快速选人抽屉（FP-05：简化版） -->
    <UserPickerDrawer
      v-if="showUserPicker"
      :z-index="3200"
      @close="showUserPicker = false"
      @confirm="onPickUsers"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  createCatalogBatch, getCatalogDetail, updateCatalog,
  type CatalogAdminUser
} from '@/api/exam'
import UserPickerDrawer from './UserPickerDrawer.vue'

/**
 * 新建/编辑分类抽屉（FP-03）。
 * 新建=批量文本（空格缩进表层级）+管理员；编辑=只读信息+单行名称+管理员 tag。
 */
const props = defineProps<{
  mode: 'create' | 'edit'
  parentId?: string
  catalogId?: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const catalogText = ref('')
const editName = ref('')
const parentName = ref('默认题库分类')
const detail = ref<{ parentName: string; libQty: number; createTime: string; createFullname: string } | null>(null)
const adminUsers = ref<CatalogAdminUser[]>([])
const inheritParentAuth = ref(false)
const childInheritCurrentAuth = ref(false)
const inheritLocked = ref(false)
const saving = ref(false)
const showUserPicker = ref(false)

const removeAdmin = (userId: string) => {
  adminUsers.value = adminUsers.value.filter(u => u.userId !== userId)
}

const onPickUsers = (users: CatalogAdminUser[]) => {
  showUserPicker.value = false
  // 合并去重
  const existing = new Set(adminUsers.value.map(u => u.userId))
  for (const u of users) {
    if (!existing.has(u.userId)) {
      adminUsers.value.push(u)
    }
  }
}

const handleSave = async () => {
  if (props.mode === 'create') {
    if (!catalogText.value.trim()) {
      toast.warn('请输入分类名称')
      return
    }
    saving.value = true
    try {
      const res: any = await createCatalogBatch({
        parentId: props.parentId || 'root',
        catalogText: catalogText.value,
        adminUserIds: adminUsers.value.map(u => u.userId),
        inheritParentAuth: inheritParentAuth.value ? 1 : 0,
        childInheritCurrentAuth: childInheritCurrentAuth.value ? 1 : 0
      })
      if (res.errors?.length) {
        toast.warn(`成功 ${res.createdCount} 个；${res.errors.length} 行有误：${res.errors[0].reason}`)
      } else {
        toast.success(`已创建 ${res.createdCount} 个分类`)
        emit('saved')
      }
    } finally {
      saving.value = false
    }
  } else {
    if (!editName.value.trim()) {
      toast.warn('请输入分类名称')
      return
    }
    saving.value = true
    try {
      await updateCatalog(props.catalogId!, {
        name: editName.value.trim(),
        adminUserIds: adminUsers.value.map(u => u.userId),
        inheritParentAuth: inheritParentAuth.value ? 1 : 0,
        childInheritCurrentAuth: childInheritCurrentAuth.value ? 1 : 0
      })
      toast.success('分类已保存')
      emit('saved')
    } finally {
      saving.value = false
    }
  }
}

onMounted(async () => {
  if (props.mode === 'edit' && props.catalogId) {
    try {
      const d: any = await getCatalogDetail(props.catalogId)
      detail.value = d
      editName.value = d.name
      parentName.value = d.parentName
      adminUsers.value = d.users || []
      inheritParentAuth.value = d.inheritParentAuth === 1
      inheritLocked.value = d.inheritParentAuth === 1
      childInheritCurrentAuth.value = d.childInheritCurrentAuth === 1
    } catch { /* handled */ }
  }
})
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: 3100;
}

.drawer {
  width: 480px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 15px;
  font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
}

.breadcrumb {
  font-size: 12px;
  color: #8a92a5;
  margin-bottom: 16px;

  .crumb-label { margin-right: 6px; }
}

.readonly-info {
  background: #fafbfd;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;

  .info-row {
    display: flex;
    font-size: 12px;
    padding: 4px 0;

    span:first-child { width: 70px; color: #8a92a5; }
    span:last-child { color: #4a5368; }
  }
}

.section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #253047;
  margin-bottom: 12px;

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: #1890ff;
  }
}

.form-item { margin-bottom: 12px; }

.form-label {
  display: block;
  font-size: 13px;
  color: #4a5368;
  margin-bottom: 6px;

  &.required::after { content: ' *'; color: #f5222d; }
}

textarea {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: #1890ff; }
}

.name-input {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;

  &:focus { border-color: #1890ff; }
}

.fill-notice {
  background: #fafbfd;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 11px;
  color: #8a92a5;
  line-height: 1.8;

  p { margin: 0; }
}

.admin-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;

  &:hover { border-color: #1890ff; }

  .admin-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f0f5ff;
    border: 1px solid #d6e4ff;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 12px;
    color: #2f54eb;

    .tag-close { font-style: normal; cursor: pointer; color: #8a92a5; &:hover { color: #f5222d; } }
  }

  .admin-placeholder { color: #b0b7c3; font-size: 12px; }

  .picker-btn { margin-left: auto; color: #8a92a5; letter-spacing: 1px; }
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4a5368;
  margin-top: 10px;
  cursor: pointer;

  input { margin: 0; }
}

.checkbox-note {
  margin: 4px 0 0 24px;
  font-size: 11px;
  color: #a0a7b8;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 7px 20px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>
