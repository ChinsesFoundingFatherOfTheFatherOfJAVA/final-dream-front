<template>
  <!-- FP-04/05 共享题库抽屉（截图33：只读字段+共享设置节） -->
    <el-drawer
    :model-value="true"
    size="560px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>共享题库</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body" @click="showSourceMenu = false">
        <div class="readonly-info">
          <div class="info-row"><span>题库名称</span><span>{{ lib?.name }}</span></div>
          <div class="info-row"><span>题库分类</span><span>{{ lib?.catalogName }}</span></div>
        </div>

        <div class="section">
          <div class="section-title">共享设置</div>
          <label class="form-label">共享范围</label>
          <div class="share-picker" role="button" tabindex="0" aria-label="设置共享范围"
               :aria-expanded="showSourceMenu"
               @click.stop="showSourceMenu = !showSourceMenu"
               @keydown.enter.prevent="showSourceMenu = !showSourceMenu">
            <template v-if="shares.length">
              <span v-for="(s, i) in shares" :key="`${s.targetType}-${s.targetId}`"
                    class="share-tag" :class="{ 'dept-tag': s.targetType === 1 }">
                {{ s.targetType === 1 ? '部门' : '人员' }}·{{ s.targetName || s.targetId }}
                <i class="tag-close" role="button" tabindex="0" :aria-label="`移除共享 ${s.targetName || s.targetId}`"
                   @click.stop="removeShare(i)" @keydown.enter.prevent.stop="removeShare(i)">×</i>
              </span>
            </template>
            <span v-else class="share-placeholder">请选择</span>
            <span class="picker-btn" aria-hidden="true">···</span>

            <!-- 共享两个维度：人（targetType=2）/ 部门（targetType=1），均由后端 exam_lib_share 落地 -->
            <div v-if="showSourceMenu" class="source-menu">
              <div class="source-item" role="button" tabindex="0" @click="openUserPicker" @keydown.enter.prevent="openUserPicker">选择人员</div>
              <div class="source-item" role="button" tabindex="0" @click="openDeptPicker" @keydown.enter.prevent="openDeptPicker">选择部门</div>
            </div>
          </div>
          <p class="share-note">被共享者（人员本人或部门内成员）可管理题库内试题，但不可删除题库</p>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '确定' }}
        </el-button>
      </div>
    </div>

    <UserPickerDrawer
      v-if="showUserPicker"
      :z-index="3200"
      @close="showUserPicker = false"
      @confirm="onPickUsers"
    />

    <DeptPickerDrawer
      v-if="showDeptPicker"
      :z-index="3200"
      @close="showDeptPicker = false"
      @confirm="onPickDepts"
    />
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getLibShare, saveLibShare, type LibItem } from '@/api/exam'
import { getPaperShare, savePaperShare } from '@/api/paper'
import type { EnterpriseDepartment } from '@/api/sm'
import UserPickerDrawer from './UserPickerDrawer.vue'
import DeptPickerDrawer from './DeptPickerDrawer.vue'

/**
 * 共享题库抽屉（FP-04/05：全量覆盖式提交）。
 * 共享范围含两个维度：人（targetType=2）与部门（targetType=1），与后端 exam_lib_share 的 target_type 对齐。
 */
/**
 * 只读展示 + 取 id，故用结构类型而非 LibItem：
 * 试卷（PaperItem）与题库（LibItem）都能满足，复用同一个抽屉。
 */
type LibLike = Pick<LibItem, 'id' | 'name' | 'catalogName'>

const props = defineProps<{ lib: LibLike | null; api?: 'ques' | 'paper' }>()

/** 试卷共享与题库共享结构同构，仅接口不同（且试卷要求已发布）。 */
const shareApi = computed(() => props.api === 'paper'
  ? { get: getPaperShare, save: savePaperShare }
  : { get: getLibShare, save: saveLibShare })
const emit = defineEmits<{ close: []; saved: [] }>()

const shares = ref<{ targetType: number; targetId: string; targetName: string }[]>([])
const showUserPicker = ref(false)
const showDeptPicker = ref(false)
const showSourceMenu = ref(false)
const saving = ref(false)

const removeShare = (index: number) => {
  shares.value.splice(index, 1)
}

const openUserPicker = () => {
  showSourceMenu.value = false
  showUserPicker.value = true
}

const openDeptPicker = () => {
  showSourceMenu.value = false
  showDeptPicker.value = true
}

/** 去重键必须带维度：人员 id 与部门 id 各自独立编号，只用 targetId 会互相误判为已存在。 */
const shareKey = (targetType: number, targetId: string) => `${targetType}-${targetId}`

const onPickUsers = (users: { userId: string; fullname: string }[]) => {
  showUserPicker.value = false
  const existing = new Set(shares.value.map(s => shareKey(s.targetType, s.targetId)))
  for (const u of users) {
    const key = shareKey(2, u.userId)
    if (!existing.has(key)) {
      shares.value.push({ targetType: 2, targetId: u.userId, targetName: u.fullname })
      existing.add(key)
    }
  }
}

/** 部门维度：后端按“用户所属部门”匹配共享，见 LibServiceImpl#sharedLibIdsOf。 */
const onPickDepts = (depts: EnterpriseDepartment[]) => {
  showDeptPicker.value = false
  const existing = new Set(shares.value.map(s => shareKey(s.targetType, s.targetId)))
  for (const d of depts) {
    const key = shareKey(1, d.deptId)
    if (!existing.has(key)) {
      shares.value.push({ targetType: 1, targetId: d.deptId, targetName: d.deptName })
      existing.add(key)
    }
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await shareApi.value.save(props.lib!.id, shares.value.map(s => ({
      targetType: s.targetType, targetId: s.targetId
    })))
    toast.success('共享设置已保存')
    emit('saved')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res: any = await shareApi.value.get(props.lib!.id)
    shares.value = res.shares || []
  } catch { /* handled */ }
})
</script>

<style scoped lang="scss">
.drawer {
  width: 560px;
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

  .close-btn { font-size: 22px; color: #999; cursor: pointer; &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
}

.readonly-info {
  background: #fafbfd;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 18px;

  .info-row {
    display: flex;
    font-size: 13px;
    padding: 4px 0;

    span:first-child { width: 80px; color: #8a92a5; }
    span:last-child { color: #4a5368; }
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: #1890ff;
  }
}

.form-label { display: block; font-size: 13px; color: #4a5368; margin-bottom: 6px; }

.share-picker {
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
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }

  .share-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #f0f5ff;
    border: 1px solid #d6e4ff;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 12px;
    color: #2f54eb;

    .tag-close { font-style: normal; cursor: pointer; color: #8a92a5; &:hover { color: #f5222d; }
      &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 2px; } }
  }

  .share-placeholder { color: #b0b7c3; font-size: 12px; }
  .picker-btn { margin-left: auto; color: #8a92a5; letter-spacing: 1px; }

  .share-tag.dept-tag {
    background: #f6ffed;
    border-color: #b7eb8f;
    color: #389e0d;
  }
}

.share-picker { position: relative; }

.source-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 128px;
  background: #fff;
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  z-index: 20;

  .source-item {
    padding: 7px 14px;
    font-size: 12px;
    color: #4a5368;
    cursor: pointer;

    &:hover { background: #f2f6ff; color: #1890ff; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
  }
}

.share-note { margin: 8px 0 0; font-size: 12px; color: #a0a7b8; }

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
