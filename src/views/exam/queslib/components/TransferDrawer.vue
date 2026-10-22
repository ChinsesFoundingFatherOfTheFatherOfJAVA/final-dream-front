<template>
  <!-- FP-04 转移题库抽屉（截图34：只读信息+原创建者+新创建者选人；batch=批量统一转给一人） -->
    <el-drawer
    :model-value="true"
    size="440px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>转移题库</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <!-- 单库转移：只读信息 -->
        <div v-if="lib" class="readonly-info">
          <div class="info-row"><span>题库名称</span><span>{{ lib.name }}</span></div>
          <div class="info-row"><span>题库分类</span><span>{{ lib.catalogName }}</span></div>
          <div class="info-row"><span>原创建者</span><span>{{ lib.createFullname }}{{ lib.createUserName ? `(${lib.createUserName})` : '' }}</span></div>
        </div>
        <div v-else class="batch-tip">已选 {{ count }} 个{{ api === 'paper' ? '试卷' : '题库' }}，将统一转移给新创建者</div>

        <div class="section">
          <div class="section-title">转移设置</div>
          <label class="form-label required">创建人</label>
          <div class="user-picker" @click="showUserPicker = true">
            <span v-if="picked" class="picked-user">
              {{ picked.fullname }}<span v-if="picked.userName">({{ picked.userName }})</span>
            </span>
            <span v-else class="picker-placeholder">请选择</span>
            <span class="picker-btn">···</span>
          </div>
          <p class="transfer-note">转移后题库所有权归属新创建者，原创建者失去管理权</p>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!picked || saving" @click="handleTransfer">
          {{ saving ? '转移中...' : '确定' }}
        </el-button>
      </div>
    </div>

    <UserPickerDrawer
      v-if="showUserPicker"
      :z-index="3200"
      @close="showUserPicker = false"
      @confirm="onPickUser"
    />
    </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@/utils/toast'
import { transferLib, batchLib, type LibItem } from '@/api/exam'
import { batchPaper, transferPaper } from '@/api/paper'

/** 转移题库抽屉（FP-04：单库 / 批量统一转给一人）。 */
/** 试卷（PaperItem）与题库（LibItem）共用的只读字段，故用结构类型。 */
type LibLike = Pick<LibItem, 'id' | 'name' | 'catalogName' | 'createFullname' | 'createUserName'>

const props = defineProps<{
  lib: LibLike | null
  batch?: boolean
  count?: number
  /** 批量模式下由父组件传入已勾选的题库 id 列表 */
  libIds?: string[]
  /** 题库（默认）还是试卷——试卷只有单库转移 */
  api?: 'ques' | 'paper'
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const picked = ref<{ userId: string; userName: string; fullname: string } | null>(null)

const onPickUser = (users: { userId: string; userName: string; fullname: string }[]) => {
  showUserPicker.value = false
  picked.value = users[0] || null
}
const showUserPicker = ref(false)
const saving = ref(false)

const handleTransfer = async () => {
  saving.value = true
  try {
    if (props.batch) {
      // 批量转移：ids 由父组件传入，本抽屉只负责选人；按 api 走各自的批量接口
      const ids = props.libIds || []
      if (props.api === 'paper') {
        await batchPaper('transfer', ids, picked.value!.userId)
        toast.success(`已将 ${ids.length} 张试卷转移给 ${picked.value!.fullname}`)
      } else {
        await batchLib('transfer', ids, picked.value!.userId)
        toast.success(`已将 ${ids.length} 个题库转移给 ${picked.value!.fullname}`)
      }
      emit('saved')
    } else {
      if (props.api === 'paper') {
        await transferPaper(props.lib!.id, picked.value!.userId)
        toast.success('试卷已转移')
      } else {
        await transferLib(props.lib!.id, picked.value!.userId)
        toast.success('题库已转移')
      }
      emit('saved')
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.drawer {
  width: 440px;
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

.batch-tip {
  background: #fffbe6;
  border: 1px solid #ffe9a8;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12px;
  color: #ad8b00;
  margin-bottom: 18px;
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

.form-label {
  display: block;
  font-size: 13px;
  color: #4a5368;
  margin-bottom: 6px;

  &.required::after { content: ' *'; color: #f5222d; }
}

.user-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 10px;
  min-height: 34px;
  cursor: pointer;

  &:hover { border-color: #1890ff; }

  .picked-user { font-size: 13px; color: #4a5368; }
  .picker-placeholder { color: #b0b7c3; font-size: 12px; }
  .picker-btn { margin-left: auto; color: #8a92a5; letter-spacing: 1px; }
}

.transfer-note { margin: 8px 0 0; font-size: 11px; color: #a0a7b8; }

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
