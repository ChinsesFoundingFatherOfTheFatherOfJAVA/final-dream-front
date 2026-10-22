<template>
  <el-drawer
    :model-value="visible"
    size="560px"
    append-to-body
    destroy-on-close
    @update:model-value="handleVisibleChange"
  >
    <template #header>
      <div class="drawer-header">
        <div class="header-title">
          <h3>个人排名</h3>
          <p>取学员总分最高分记录进行排名</p>
        </div>
        <div class="header-actions">
          <span class="dimension-label">维度</span>
          <el-select v-model="activeDimension" class="dimension-select" @change="loadRank">
            <el-option
              v-for="dimension in rankTabs"
              :key="dimension || '__total__'"
              :label="dimensionLabel(dimension)"
              :value="dimension"
            />
          </el-select>
        </div>
      </div>
    </template>

    <div class="search-bar">
      <el-input
        v-model.trim="keyword"
        placeholder="搜索姓名"
        clearable
        @keyup.enter="searchRank"
      />
      <el-button :disabled="loading" @click="searchRank">搜索</el-button>
    </div>

    <div class="rank-content">
            <div v-if="loading" class="drawer-state">排名加载中...</div>
            <div v-else-if="error" class="drawer-state">{{ error }}</div>
            <div v-else-if="!rankList.length" class="drawer-state">
              {{ keyword ? '未找到匹配学员' : '暂无排名数据' }}
            </div>
            <ol v-else class="rank-list">
              <li v-for="item in rankList" :key="item.userId" :class="{ me: item.isMe }">
                <span class="rank-index" :class="rankClass(item.rankIndex)">
                  {{ item.rankIndex }}
                </span>
                <span class="avatar">{{ (item.fullname || '员').slice(0, 1) }}</span>
                <div class="student-info">
                  <div class="student-name">
                    <strong>{{ item.fullname || '--' }}</strong>
                    <span v-if="item.isMe" class="me-tag">(我)</span>
                  </div>
                  <p :title="item.deptName">{{ item.deptName || '--' }}</p>
                </div>
                <strong class="score">{{ formatScore(item.score) }}</strong>
              </li>
            </ol>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getStudentRank } from '@/api/student'
import type { ProjectRankResp } from '@/types/student'

const props = defineProps<{
  visible: boolean
  projectId: string
}>()

const emit = defineEmits<{ close: [] }>()

const rankData = ref<ProjectRankResp | null>(null)
const activeDimension = ref('')
const keyword = ref('')
const loading = ref(false)
const error = ref('')

const rankTabs = computed(() => {
  const dimensions = rankData.value?.dimensions ?? []
  return Array.from(new Set(['', ...dimensions.filter(Boolean)]))
})
const rankList = computed(() => rankData.value?.rankList ?? [])

const dimensionLabel = (dimension: string) => dimension || '总分'

const rankClass = (rankIndex: number) => {
  if (rankIndex === 1) return 'top-1'
  if (rankIndex === 2) return 'top-2'
  if (rankIndex === 3) return 'top-3'
  return ''
}

const formatScore = (score: number | null | undefined) =>
  score == null ? '--' : Number(score).toFixed(1)

const close = () => emit('close')

const handleVisibleChange = (visible: boolean) => {
  if (!visible) close()
}

const loadRank = async () => {
  if (!props.projectId) {
    error.value = '缺少项目参数'
    return
  }
  loading.value = true
  error.value = ''
  try {
    rankData.value = await getStudentRank(props.projectId, {
      dimension: activeDimension.value || undefined,
      keyword: keyword.value || undefined
    })
  } catch (e: unknown) {
    rankData.value = null
    error.value = e instanceof Error ? e.message : '排名加载失败'
  } finally {
    loading.value = false
  }
}

const searchRank = () => {
  void loadRank()
}

watch(
  () => [props.visible, props.projectId],
  ([visible]) => {
    if (!visible) return
    activeDimension.value = ''
    keyword.value = ''
    void loadRank()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #e9edf4;

  .header-title {
    min-width: 0;

    h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
    }

    p {
      margin: 5px 0 0;
      color: #8a92a5;
      font-size: 12px;
      white-space: nowrap;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.dimension-select {
  width: 130px;
}

.dimension-label {
  color: #596274;
  font-size: 13px;
}

.search-bar {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #e9edf4;
  :deep(.el-input) {
    flex: 1;
    min-width: 0;
  }

  :deep(.el-input__wrapper) {
    min-height: 40px;
    border-radius: 6px;
  }
}

.rank-content {
  flex: 1;
  min-height: 0;
  padding: 12px 18px 28px;
  overflow-y: auto;
}

.drawer-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  color: #8a92a5;
  font-size: 14px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 68px;
    padding: 12px 14px;
    border: 1px solid #edf0f5;
    border-radius: 9px;
    background: #fff;

    &.me {
      border-color: #8eb5ff;
      background: #f5f9ff;
    }
  }
}

.rank-index {
  width: 32px;
  flex-shrink: 0;
  color: #7a8396;
  font-size: 20px;
  font-weight: 700;
  text-align: center;

  &.top-1 {
    color: #d99a00;
  }

  &.top-2 {
    color: #7f8c9f;
  }

  &.top-3 {
    color: #b66a2c;
  }
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a7dff, #6f62dc);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.student-info {
  flex: 1;
  min-width: 0;

  p {
    margin: 5px 0 0;
    overflow: hidden;
    color: #8a92a5;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.student-name {
  display: flex;
  align-items: center;
  gap: 5px;

  strong {
    overflow: hidden;
    color: #253047;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.me-tag {
  flex-shrink: 0;
  color: #2e7cf6;
  font-size: 12px;
  font-weight: 600;
}

.score {
  flex-shrink: 0;
  color: #2e7cf6;
  font-size: 28px;
}

@media (max-width: 760px) {
  .drawer-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
