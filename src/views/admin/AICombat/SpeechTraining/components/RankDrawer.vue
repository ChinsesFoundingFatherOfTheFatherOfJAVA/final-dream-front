<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div v-if="visible" class="drawer-overlay" @click.self="close">
        <aside class="rank-drawer">
          <header class="drawer-header">
            <div class="header-title">
              <h3>个人排名</h3>
              <p>取学员总分最高分记录进行排名</p>
            </div>
            <div class="header-actions">
              <label class="dimension-select">
                <span>维度</span>
                <select :value="activeDimension" @change="onDimensionChange">
                  <option v-for="dimension in rankTabs" :key="dimension || '__total__'" :value="dimension">
                    {{ dimensionLabel(dimension) }}
                  </option>
                </select>
              </label>
              <button type="button" class="close-btn" aria-label="关闭" @click="close">×</button>
            </div>
          </header>

          <div class="search-bar">
            <input
              v-model.trim="keyword"
              type="search"
              placeholder="搜索姓名"
              @keyup.enter="searchRank"
            />
            <button type="button" :disabled="loading" @click="searchRank">搜索</button>
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
        </aside>
      </div>
    </transition>
  </teleport>
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

const selectDimension = (dimension: string) => {
  if (activeDimension.value === dimension) return
  activeDimension.value = dimension
  void loadRank()
}

const onDimensionChange = (event: Event) => {
  selectDimension((event.target as HTMLSelectElement).value)
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
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2700;
  background: rgba(15, 23, 42, 0.38);
}

.rank-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(560px, 94vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fb;
  box-shadow: -18px 0 48px rgba(15, 23, 42, 0.16);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #e9edf4;
  background: #fff;

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
  display: flex;
  align-items: center;
  gap: 6px;
  color: #596274;
  font-size: 13px;

  select {
    height: 40px;
    min-width: 126px;
    padding: 0 30px 0 10px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #253047;
    font-size: 13px;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #2e7cf6;
    }
  }
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: #8a92a5;
  font-size: 25px;
  line-height: 1;
  cursor: pointer;
}

.search-bar {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #e9edf4;
  background: #fff;

  input {
    flex: 1;
    min-width: 0;
    height: 40px;
    box-sizing: border-box;
    padding: 0 11px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    color: #4d5568;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #2e7cf6;
    }
  }

  button {
    height: 40px;
    padding: 0 18px;
    border: 1px solid #2e7cf6;
    border-radius: 6px;
    background: #2e7cf6;
    color: #fff;
    font-size: 13px;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
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

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.18s ease;

  .rank-drawer {
    transition: transform 0.22s ease;
  }
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;

  .rank-drawer {
    transform: translateX(24px);
  }
}

@media (max-width: 760px) {
  .rank-drawer {
    width: 100%;
  }

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
