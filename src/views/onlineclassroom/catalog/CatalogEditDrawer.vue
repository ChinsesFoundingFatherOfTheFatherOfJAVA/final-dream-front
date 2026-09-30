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
        <input :value="parentPath" type="text" readonly />
      </label>
      <label v-if="mode === 'edit' && createUserText" class="form-row">
        <span>创建人</span>
        <input :value="createUserText" type="text" readonly />
      </label>
      <label class="form-row" :class="{ invalid: nameError }">
        <span>分类名称</span>
        <input v-model="form.name" type="text" maxlength="50" placeholder="建议6个字以内" />
        <small>{{ form.name.length }}/50</small>
      </label>
      <p v-if="nameError" class="error-text">请输入分类名称，建议6个字以内</p>

      <div class="form-row radio-row">
        <span>默认课程顺序</span>
        <div class="radio-options">
          <label v-for="item in orderTypes" :key="item.value">
            <input v-model.number="form.orderType" type="radio" :value="item.value" />
            <span>{{ item.label }}</span>
          </label>
        </div>
      </div>

      <div class="form-row prefix-row">
        <span>前后缀设置</span>
        <div>
          <label>
            <input v-model="form.prefixEnabled" type="checkbox" />
            前缀
          </label>
          <input
            v-model="form.prefixContent"
            type="text"
            maxlength="50"
            :disabled="!form.prefixEnabled"
            placeholder="请输入前缀内容"
          />
          <label>
            <input v-model="form.dateSuffixEnabled" type="checkbox" />
            日期后缀
          </label>
          <select v-model="form.dateSuffixFormat" :disabled="!form.dateSuffixEnabled">
            <option value="yyyy-MM-dd">yyyy-MM-dd</option>
            <option value="yyyy/MM/dd">yyyy/MM/dd</option>
            <option value="yyyyMMdd">yyyyMMdd</option>
          </select>
        </div>
      </div>
    </form>

    <section class="permission-section">
      <header>
        <div>
          <h4>权限设置</h4>
          <p v-if="form.inheritParent">已勾选继承父分类权限，保存后使用父分类权限快照。</p>
        </div>
        <button type="button" class="add-subject" :disabled="form.inheritParent" @click="pickerVisible = true">
          + 添加用户权限
        </button>
      </header>

      <div class="permission-table" :class="{ readonly: form.inheritParent }">
        <div class="permission-row header-row">
          <span>授权对象</span>
          <label v-for="column in permissionColumns" :key="column.code">
            <input
              type="checkbox"
              :checked="rowAllChecked(column.code)"
              :indeterminate="rowIndeterminate(column.code)"
              :disabled="form.inheritParent"
              @change="toggleAll(column.code)"
            />
            {{ column.label }}
          </label>
          <span></span>
        </div>
        <div v-for="row in form.permissions" :key="rowKey(row)" class="permission-row">
          <span :title="row.subjectName">{{ row.subjectName }}</span>
          <label v-for="column in permissionColumns" :key="column.code">
            <input
              type="checkbox"
              :checked="row.permCodes.includes(column.code)"
              :disabled="form.inheritParent"
              @change="togglePermission(row, column.code)"
            />
          </label>
          <button
            v-if="row.subjectType >= 4"
            type="button"
            class="remove-row"
            :disabled="form.inheritParent"
            @click="removePermissionRow(row)"
          >
            ×
          </button>
          <span v-else></span>
        </div>
      </div>
    </section>

    <section v-if="mode === 'edit'" class="inherit-section">
      <label class="check-line">
        <input v-model="form.inheritParent" type="checkbox" />
        <span>继承父分类权限（勾选后使用父分类权限覆盖当前分类权限，不允许修改）</span>
      </label>
      <label class="check-line">
        <input v-model="form.childrenInherit" type="checkbox" />
        <span>所有子分类继承当前分类权限（保存后递归覆盖全部子孙分类）</span>
      </label>
      <div class="merge-line">
        <span>在父分类中添加当前分类权限</span>
        <button type="button" :disabled="!catalogId" @click="mergeToParent">一键执行</button>
      </div>
    </section>

    <template #footer>
      <button type="button" class="btn ghost" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" :disabled="saving" @click="save">
        {{ saving ? '保存中...' : '确定' }}
      </button>
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
    prefixContent: form.prefixEnabled ? form.prefixContent?.trim() : null,
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
  color: #4d5568;
  font-size: 13px;

  > input,
  select {
    height: 36px;
    min-width: 0;
    padding: 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    outline: none;
  }

  small {
    color: #98a1b2;
  }

  &.invalid input {
    border-color: #e54545;
  }
}

.error-text {
  margin: -8px 0 0 120px;
  color: #e54545;
  font-size: 12px;
}

.radio-row {
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: center;
}

.radio-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 30px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
}

.prefix-row {
  align-items: flex-start;

  > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    input[type='text'] {
      width: 180px;
      height: 34px;
      padding: 0 9px;
      border: 1px solid #d9deea;
      border-radius: 6px;
    }
  }
}

.permission-section,
.inherit-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #e9edf4;
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
    color: #8a92a5;
    font-size: 12px;
  }
}

.add-subject {
  border: none;
  background: transparent;
  color: #e75487;
  cursor: pointer;
}

.permission-table {
  border: 1px solid #e6eaf1;
  border-radius: 8px;
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
  border-bottom: 1px solid #edf0f5;
  color: #4d5568;
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

  label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    white-space: nowrap;
  }
}

.header-row {
  background: #f8fafc;
  color: #667085;
  font-weight: 600;
}

.remove-row {
  border: none;
  background: transparent;
  color: #d94a4a;
  cursor: pointer;
}

.inherit-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #4d5568;
  font-size: 13px;
  line-height: 1.5;
}

.merge-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4d5568;
  font-size: 13px;

  button {
    height: 32px;
    padding: 0 14px;
    border: 1px solid #e75487;
    border-radius: 6px;
    background: #fff;
    color: #e75487;
    cursor: pointer;
  }
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;

  &.ghost {
    border: 1px solid #d9deea;
    background: #fff;
    color: #596274;
  }

  &.primary {
    border: none;
    background: #e75487;
    color: #fff;
  }
}
</style>
