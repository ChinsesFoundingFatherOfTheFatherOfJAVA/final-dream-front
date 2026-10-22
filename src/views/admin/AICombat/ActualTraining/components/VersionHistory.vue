<template>
  <div class="version-history">
    <p class="page-desc">查看主题的完整版本历史，了解每次更新的内容和影响范围</p>

    <div v-if="loading" class="list-tip">加载中…</div>
    <div
      v-for="v in versions"
      :key="v.versionNo"
      class="version-card"
    >
      <div class="version-head">
        <div class="version-no-row">
          <span class="version-no">{{ v.versionNo }}</span>
          <span v-if="v.current" class="current-badge">当前版本</span>
        </div>
        <span class="version-time">{{ v.createdAt }}</span>
      </div>
      <div class="version-stats">
        <div class="stat-col">
          <span class="stat-num">{{ v.usedUserCount }} 人</span>
          <span class="stat-label">使用人数</span>
        </div>
        <div class="stat-col">
          <span class="stat-num green">{{ v.completedCount }} 人</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-col">
          <span class="stat-num blue">{{ v.inProgressCount }} 人</span>
          <span class="stat-label">进行中</span>
        </div>
      </div>
      <div class="version-foot">
        <span class="creator">创建者：{{ v.creator }}</span>
        <el-button v-if="!v.current" class="rollback-btn" @click="onRollback(v.versionNo)">回滚到此版本</el-button>
      </div>
    </div>

    <ConfirmDialog
      :visible="confirmVisible"
      title="确认回滚"
      :message="confirmMessage"
      confirm-text="确认回滚"
      :loading="rolling"
      @confirm="doRollback"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getThemeVersions, rollbackThemeVersion } from '@/api/actTheme'
import type { ActVersionItem } from '@/types/actTheme'
import ConfirmDialog from './ConfirmDialog.vue'
import { showToast } from './ui'

const props = defineProps<{ themeId: string }>()
const emit = defineEmits<{ (e: 'rolled-back'): void }>()

const loading = ref(false)
const versions = ref<ActVersionItem[]>([])
const confirmVisible = ref(false)
const confirmMessage = ref('')
const rolling = ref(false)
let targetVersion = ''

const load = async () => {
  loading.value = true
  try {
    versions.value = await getThemeVersions(props.themeId)
  } finally {
    loading.value = false
  }
}

defineExpose({ load })

const onRollback = (versionNo: string) => {
  targetVersion = versionNo
  confirmMessage.value = `回滚后主题将恢复为版本 ${versionNo} 的配置内容（不产生新版本），确定要回滚吗？`
  confirmVisible.value = true
}

const doRollback = async () => {
  rolling.value = true
  try {
    await rollbackThemeVersion(props.themeId, targetVersion)
    showToast('回滚成功')
    confirmVisible.value = false
    emit('rolled-back')
    await load()
  } catch (e) {
    if (e instanceof Error && e.message) showToast(e.message)
  } finally {
    rolling.value = false
  }
}

load()
</script>

<style scoped lang="scss">
.version-history {
  .page-desc {
    font-size: 14px;
    color: #8a8f98;
    margin: 0 0 16px;
  }
}

.list-tip {
  padding: 40px 0;
  text-align: center;
  font-size: 15px;
  color: #999;
}

.version-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 18px;
  margin-bottom: 12px;

  .version-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .version-no-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .version-no {
    font-size: 22px;
    font-weight: 700;
    color: #1f2329;
  }

  .current-badge {
    padding: 1px 10px;
    border-radius: 4px;
    font-size: 13px;
    color: #1890ff;
    background: #e6f7ff;
  }

  .version-time { font-size: 13px; color: #a5a9b0; }

  .version-stats {
    display: flex;
    background: #f5f6f8;
    border-radius: 8px;
    padding: 12px 0;
    margin-bottom: 12px;

    .stat-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      &:not(:last-child) { border-right: 1px solid #ebeef2; }

      .stat-num {
        font-size: 16px;
        font-weight: 600;
        color: #1f2329;

        &.green { color: #52c41a; }
        &.blue { color: #1890ff; }
      }

      .stat-label { font-size: 13px; color: #8a8f98; }
    }
  }

  .version-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .creator { font-size: 13px; color: #a5a9b0; }

  .rollback-btn {
    padding: 5px 14px;
    background: #fff;
    color: #1890ff;
    border: 1px solid #1890ff;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: #f0f8ff; }
  }
}
</style>
