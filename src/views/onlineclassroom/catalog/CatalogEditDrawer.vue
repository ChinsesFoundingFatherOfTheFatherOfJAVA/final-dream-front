<template>
  <KngDrawer
    :visible="visible"
    :title="mode === 'create' ? '新增分类' : '编辑分类'"
    :subtitle="mode === 'create' ? '创建分类并设置默认权限' : '修改分类基本信息与权限'"
    :width="720"
    :z-index="3100"
    @close="emit('close')"
  >
    <form class="edit-form" @submit.prevent="save">
      <label class="form-row">
        <span>所属分类</span>
        <el-input :model-value="parentPath" readonly />
      </label>
      <label v-if="mode === 'edit' && createUserText" class="form-row">
        <span>创建人</span>
        <el-input :model-value="createUserText" readonly />
      </label>
      <label class="form-row" :class="{ invalid: nameError }">
        <span>分类名称</span>
        <el-input
          v-model="form.name"
          maxlength="50"
          show-word-limit
          placeholder="建议6个字以内"
        />
      </label>
      <p v-if="nameError" class="error-text">请输入分类名称，建议6个字以内</p>

      <div class="form-row radio-row">
        <span>默认课程顺序</span>
        <el-radio-group v-model="form.orderType" class="radio-options">
          <el-radio v-for="item in orderTypes" :key="item.value" :value="item.value">
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </div>

      <div class="form-row prefix-row">
        <span>前后缀设置</span>
        <div>
          <el-checkbox v-model="form.prefixEnabled">前缀</el-checkbox>
          <el-input
            v-model="form.prefixContent"
            maxlength="50"
            :disabled="!form.prefixEnabled"
            placeholder="请输入前缀内容"
          />
          <el-checkbox v-model="form.dateSuffixEnabled">日期后缀</el-checkbox>
          <el-select v-model="form.dateSuffixFormat" :disabled="!form.dateSuffixEnabled">
            <el-option label="yyyy-MM-dd" value="yyyy-MM-dd" />
            <el-option label="yyyy/MM/dd" value="yyyy/MM/dd" />
            <el-option label="yyyyMMdd" value="yyyyMMdd" />
          </el-select>
        </div>
      </div>
    </form>

    <section class="permission-section">
      <header>
        <div>
          <h4>权限设置</h4>
          <p v-if="form.inheritParent">已勾选继承父分类权限，保存后使用父分类权限快照。</p>
        </div>
        <el-button class="add-subject" :disabled="form.inheritParent" @click="pickerVisible = true">
          + 添加用户权限
        </el-button>
      </header>

      <div class="permission-table" :class="{ readonly: form.inheritParent }">
        <div class="permission-row header-row">
          <span>授权对象</span>
          <el-checkbox
            v-for="column in permissionColumns"
            :key="column.code"
            :model-value="rowAllChecked(column.code)"
              :indeterminate="rowIndeterminate(column.code)"
              :disabled="form.inheritParent"
            @change="toggleAll(column.code)"
          >
            {{ column.label }}
          </el-checkbox>
          <span></span>
        </div>
        <div v-for="row in form.permissions" :key="rowKey(row)" class="permission-row">
          <span :title="row.subjectName">{{ row.subjectName }}</span>
          <el-checkbox
            v-for="column in permissionColumns"
            :key="column.code"
            :model-value="row.permCodes.includes(column.code)"
              :disabled="form.inheritParent"
            @change="togglePermission(row, column.code)"
          />
          <el-button
            v-if="row.subjectType >= 4"
            class="remove-row"
            :disabled="form.inheritParent"
            :aria-label="`移除${row.subjectName}`"
            @click="removePermissionRow(row)"
          >
            ×
          </el-button>
          <span v-else></span>
        </div>
      </div>
    </section>

    <section v-if="mode === 'edit'" class="inherit-section">
      <el-checkbox v-model="form.inheritParent" class="check-line">
        继承父分类权限（勾选后使用父分类权限覆盖当前分类权限，不允许修改）
      </el-checkbox>
      <el-checkbox v-model="form.childrenInherit" class="check-line">
        所有子分类继承当前分类权限（保存后递归覆盖全部子孙分类）
      </el-checkbox>
      <div class="merge-line">
        <span>在父分类中添加当前分类权限</span>
        <el-button :disabled="!catalogId" @click="mergeToParent">一键执行</el-button>
      </div>
    </section>

    <template #footer>
      <el-button class="btn ghost" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" :disabled="saving" @click="save">
        {{ saving ? '保存中...' : '确定' }}
      </el-button>
    </template>
  </KngDrawer>

  <SubjectPickerDrawer
    :visible="pickerVisible"
    :existing="form.permissions"
    @close="pickerVisible = false"
    @confirm="applySubjects"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import KngDrawer from '../components/KngDrawer.vue'
import SubjectPickerDrawer from './SubjectPickerDrawer.vue'
import {
  createKngCatalog,
  getKngCatalogDetail,
  mergeKngCatalogToParent,
  updateKngCatalog,
  type KngCatalogSaveReq,
  type KngPermissionItem
} from '@/api/kng'
import { toast } from '@/utils/toast'

const props = withDefaults(defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  catalogId?: string
  parentId?: string | null
  parentPath?: string
}>(), {
  catalogId: '',
  parentId: null,
  parentPath: '主课堂'
})

const emit = defineEmits<{
  close: []
  saved: []
}>()

const orderTypes = [
  { value: 1, label: '发布时间' },
  { value: 2, label: '更新时间' },
  { value: 3, label: '名称' },
  { value: 4, label: '学习人数' }
]
const permissionColumns = [
  { code: 3, label: '分发' },
  { code: 4, label: '维护' },
  { code: 1, label: '浏览' },
  { code: 2, label: '允许下载课件' },
  { code: 5, label: 'App缓存课件' }
]

const defaultPermissions = (): KngPermissionItem[] => [
  { subjectType: 1, subjectId: null, subjectName: '超级管理员&分类创建者', permCodes: [1, 2, 3, 4, 5] },
  { subjectType: 2, subjectId: null, subjectName: '课堂管理员', permCodes: [1, 2, 3, 4, 5] },
  { subjectType: 3, subjectId: null, subjectName: '课堂成员', permCodes: [1, 2, 5] }
]

const form = reactive<KngCatalogSaveReq>({
  parentId: null,
  name: '',
  orderType: 1,
  prefixEnabled: false,
  prefixContent: null,
  dateSuffixEnabled: false,
  dateSuffixFormat: 'yyyy-MM-dd',
  inheritParent: false,
  childrenInherit: false,
  permissions: defaultPermissions()
})

const saving = ref(false)
const nameError = ref(false)
const pickerVisible = ref(false)
const createUserText = ref('')

const rowKey = (row: KngPermissionItem) => `${row.subjectType}:${row.subjectId ?? 'null'}`
const rowAllChecked = (code: number) =>
  form.permissions.length > 0 && form.permissions.every(row => row.permCodes.includes(code))
const rowIndeterminate = (code: number) => {
  const count = form.permissions.filter(row => row.permCodes.includes(code)).length
  return count > 0 && count < form.permissions.length
}

const resetForm = () => {
  Object.assign(form, {
    parentId: props.parentId,
    name: '',
    orderType: 1,
    prefixEnabled: false,
    prefixContent: null,
    dateSuffixEnabled: false,
    dateSuffixFormat: 'yyyy-MM-dd',
    inheritParent: false,
    childrenInherit: false,
    permissions: defaultPermissions()
  })
  nameError.value = false
  createUserText.value = ''
}

const loadDetail = async () => {
  if (props.mode !== 'edit' || !props.catalogId) {
    resetForm()
    return
  }
  const detail = await getKngCatalogDetail(props.catalogId)
  Object.assign(form, {
    parentId: detail.parentId ?? null,
    name: detail.name,
    orderType: detail.orderType,
    prefixEnabled: detail.prefixEnabled,
    prefixContent: detail.prefixContent,
    dateSuffixEnabled: detail.dateSuffixEnabled,
    dateSuffixFormat: detail.dateSuffixFormat ?? 'yyyy-MM-dd',
    inheritParent: detail.inheritParent,
    childrenInherit: false,
    permissions: detail.permissions.length ? detail.permissions : defaultPermissions()
  })
  createUserText.value = detail.createUser
    ? `${detail.createUser.name}/${detail.createUser.account}（创建人有该目录的所有权限）`
    : ''
}

const toggleAll = (code: number) => {
  const all = rowAllChecked(code)
  for (const row of form.permissions) {
    row.permCodes = all
      ? row.permCodes.filter(item => item !== code)
      : Array.from(new Set([...row.permCodes, code])).sort()
  }
}

const togglePermission = (row: KngPermissionItem, code: number) => {
  row.permCodes = row.permCodes.includes(code)
    ? row.permCodes.filter(item => item !== code)
    : [...row.permCodes, code].sort()
}

const removePermissionRow = (row: KngPermissionItem) => {
  form.permissions = form.permissions.filter(item => rowKey(item) !== rowKey(row))
}

const applySubjects = (items: KngPermissionItem[]) => {
  const next = form.permissions.filter(row => row.subjectType <= 3)
  const existingCodes = new Map(
    form.permissions.filter(row => row.subjectType >= 4).map(row => [rowKey(row), row.permCodes])
  )
  const custom = new Map<string, KngPermissionItem>()
  for (const item of items) {
    custom.set(rowKey(item), {
      ...item,
      permCodes: existingCodes.get(rowKey(item)) ?? []
    })
  }
  form.permissions = [...next, ...custom.values()]
  pickerVisible.value = false
}

const mergeToParent = async () => {
  if (!props.catalogId) return
  const result = await mergeKngCatalogToParent(props.catalogId)
  toast.info(`已合并到父分类，新增 ${result.count} 行权限`)
}

const save = async () => {
  nameError.value = !form.name.trim()
  if (nameError.value) return
  if (form.name.trim().length > 50) {
    nameError.value = true
    return
  }
  if (form.prefixEnabled && !form.prefixContent?.trim()) {
    toast.warn('请填写前缀内容')
    return
  }
  const payload: KngCatalogSaveReq = {
    ...form,
    parentId: props.mode === 'create' ? props.parentId : form.parentId,
    name: form.name.trim(),
    prefixContent: form.prefixEnabled ? (form.prefixContent?.trim() ?? null) : null,
    dateSuffixFormat: form.dateSuffixEnabled ? form.dateSuffixFormat : null,
    permissions: form.permissions.map(row => ({ ...row, permCodes: [...row.permCodes].sort() }))
  }
  saving.value = true
  try {
    if (props.mode === 'create') await createKngCatalog(payload)
    else await updateKngCatalog(props.catalogId, payload)
    toast.info('已保存')
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.visible, props.catalogId, props.mode],
  ([visible]) => {
    if (visible) void loadDetail()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: 10px;
  color: var(--color-ink-2);
  font-size: 13px;

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    min-height: 36px;
    min-width: 0;
    border-radius: 6px;
  }

  small {
    color: var(--color-muted);
  }

  &.invalid :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--color-error) inset;
  }
}

.error-text {
  margin: -8px 0 0 120px;
  color: var(--color-error);
  font-size: 12px;
}

.radio-row {
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: center;
}

.radio-options {
  :deep(.el-radio) {
    margin-right: 30px;
  }
}

.prefix-row {
  align-items: flex-start;

  > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    :deep(.el-checkbox) {
      margin-right: 2px;
    }

    :deep(.el-input) {
      width: 180px;
    }

    :deep(.el-input__wrapper) {
      min-height: 34px;
      border-radius: 6px;
    }

    :deep(.el-select) {
      width: 150px;
    }
  }
}

.permission-section,
.inherit-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: var(--rule-hair) solid var(--color-rule);
}

.permission-section header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h4 {
    margin: 0;
    font-size: 14px;
  }

  p {
    margin: 5px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }
}

.add-subject {
  border: none;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
}

.permission-table {
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  overflow: hidden;

  &.readonly {
    opacity: 0.58;
  }
}

.permission-row {
  display: grid;
  grid-template-columns:
    minmax(140px, 1.4fr)
    repeat(3, minmax(58px, 0.7fr))
    repeat(2, minmax(92px, 1.1fr))
    28px;
  align-items: center;
  min-height: 42px;
  border-bottom: var(--rule-hair) solid var(--color-rule);
  color: var(--color-ink-2);
  font-size: 12px;

  &:last-child {
    border-bottom: none;
  }

  > span:first-child {
    overflow: hidden;
    padding: 0 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.el-checkbox) {
    justify-content: center;
    min-width: 0;
    margin-right: 0;
  }
}

.header-row {
  background: var(--color-paper-2);
  color: var(--color-muted);
  font-weight: 500;
}

.remove-row {
  border: none;
  background: transparent;
  color: var(--color-error);
  cursor: pointer;
}

.inherit-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-line {
  color: var(--color-ink-2);
  font-size: 13px;
  line-height: 1.5;

  :deep(.el-checkbox__label) {
    color: var(--color-ink-2);
    font-size: 13px;
    line-height: 1.5;
    white-space: normal;
  }
}

.merge-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-ink-2);
  font-size: 13px;

  :deep(.el-button) {
    height: 32px;
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;

  &.ghost {
    border: 1px solid var(--color-rule-2);
    background: var(--color-paper);
    color: var(--color-ink-2);
  }

  &.primary {
    border: none;
    background: var(--color-accent);
    color: var(--color-accent-ink);
  }
}
</style>
