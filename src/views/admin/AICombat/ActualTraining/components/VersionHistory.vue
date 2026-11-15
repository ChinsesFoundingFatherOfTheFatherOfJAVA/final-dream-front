<template>
  <div class="version-history">
    <p class="page-desc">查看主题的完整版本历史，了解每次更新的内容和影响范围</p>

    <div v-if="loading" class="list-tip">加载中…</div>
    <div class="version-list">
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
            <span class="stat-label">使用人数</span>
            <span class="stat-num">{{ v.usedUserCount }} 人</span>
          </div>
          <div class="stat-col">
            <span class="stat-label">已完成</span>
            <span class="stat-num green">{{ v.completedCount }} 人</span>
          </div>
          <div class="stat-col">
            <span class="stat-label">进行中</span>
            <span class="stat-num blue">{{ v.inProgressCount }} 人</span>
          </div>
        </div>
        <div class="version-foot">
          <span class="creator">创建者：{{ v.creator }}</span>
          <div class="rollback-slot">
            <el-button v-if="!v.current" class="rollback-btn" @click="onRollback(v.versionNo)">回滚到此版本</el-button>
          </div>
        </div>
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
  display: block;

  .page-desc {
    height: 22px;
    margin: 0;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }
}

.list-tip {
  padding: 40px 0;
  text-align: center;
  font-size: 15px;
  color: var(--color-muted);
}

.version-list {
  display: block;
  margin-top: 16px;
}

.version-card {
  display: block;
  box-sizing: border-box;
  height: 206px;
  padding: 20px;
  margin-top: 0;
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 12px;

  .version-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    height: 28px;
    margin: 0 0 16px;
  }

  .version-no-row {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 28px;
  }

  .version-no {
    font-size: 18px;
    font-weight: 700;
    line-height: 28px;
    color: var(--color-ink);
  }

  .current-badge {
    box-sizing: border-box;
    height: 22px;
    padding: 2px 8px;
    border: 1px solid var(--color-accent-wash);
    border-radius: 4px;
    font-size: 12px;
    line-height: 16px;
    color: var(--color-accent);
    background: var(--color-accent-wash);
  }

  .version-time {
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }

  .version-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    box-sizing: border-box;
    height: 82px;
    padding: 16px;
    margin: 0 0 16px;
    background: var(--color-paper-2);
    border-radius: 8px;

    .stat-col {
      display: block;
      min-width: 0;
    }

    .stat-label {
      display: block;
      height: 22px;
      font-size: 14px;
      line-height: 22px;
      color: var(--color-muted);
    }

    .stat-num {
      display: block;
      height: 28px;
      font-size: 18px;
      font-weight: 700;
      line-height: 28px;
      color: var(--color-ink);

      &.green { color: var(--color-success); }
      &.blue { color: var(--color-accent); }
    }
  }

  .version-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 22px;
  }

  .creator {
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }

  .rollback-slot {
    display: flex;
    gap: 8px;
  }

  .rollback-btn {
    padding: 5px 14px;
    background: var(--color-paper);
    color: var(--color-accent);
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover { background: var(--color-accent-wash); }
  }
}
</style>
