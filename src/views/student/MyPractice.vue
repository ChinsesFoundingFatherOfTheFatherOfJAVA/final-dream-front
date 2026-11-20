<template>
  <div class="my-practice">
    <div class="layout">
      <!-- 左侧用户信息栏 -->
      <aside class="user-sidebar">
        <div class="user-avatar">
          <span class="avatar-text">员</span>
        </div>
        <h3 class="user-name">{{ authStore.displayName }}</h3>
        <div class="user-badges">
          <span class="medal-badge"><el-icon aria-hidden="true"><Medal /></el-icon> 0枚勋章</span>
          <span class="level-badge">Lv.2</span>
        </div>
        <div class="user-exp">
          <span class="exp-text">等级经验值 <strong>280</strong>/24000</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 1.2%"></div>
          </div>
        </div>
        <div class="user-stats">
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">今日学习</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">获得证书</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">获得积分</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">总学分</span>
          </div>
        </div>
        <div class="user-credits">
          <span class="credits-label">我的学分</span>
          <span class="credits-value">0</span>
          <el-icon class="credits-icon" aria-hidden="true"><Trophy /></el-icon>
        </div>
        <div class="pk-ranking">
          <div class="ranking-header" title="敬请期待">
            <span class="ranking-title">PK榜 <el-icon class="btn-caret"><ArrowDown /></el-icon></span>
          </div>
          <div class="ranking-content">
            <span class="view-all" title="敬请期待">查看全部 ></span>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <!--
          「待学习 / 教学任务」两 tab（契约 01 §M4）。
          分 tab 而不是并列两个区块：待学习是「我要做的事」，教学任务是「我要批的卷」，
          两种身份的操作混在一屏会让批阅人翻很久才找到自己的待办。
        -->
        <el-tabs v-model="activeTab" class="practice-tabs" @tab-change="onTabChange">
          <el-tab-pane label="待学习" name="learning">
            <div class="content-header">
              <div class="header-left">
                <h2 class="page-title">待学习</h2>
                <span class="task-count">学习任务 <strong>{{ tasks.length }}</strong></span>
              </div>
            </div>

            <div class="task-list">
              <div v-if="!tasks.length && !loading" class="task-empty">暂无学习任务</div>
              <div v-for="task in tasks" :key="task.id" class="task-card" title="敬请期待">
                <div class="task-tags">
                  <span v-for="tag in task.tags" :key="tag" class="tag" :class="getTagClass(tag)">{{ tag }}</span>
                </div>
                <h4 class="task-title">{{ task.title }}</h4>
                <p class="task-time">{{ task.startTime }} ~ {{ task.endTime }}</p>
              </div>
            </div>
          </el-tab-pane>

          <!-- 教学任务：批阅人视角的待批阅队列（契约 01 §M4） -->
          <el-tab-pane label="教学任务" name="teaching">
            <MarkTodoList v-if="activeTab === 'teaching'" />
          </el-tab-pane>
        </el-tabs>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Medal, Trophy } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import { getStudentProjects } from '@/api/student'
import { useAuthStore } from '@/stores/auth'
import MarkTodoList from './components/MarkTodoList.vue'

const authStore = useAuthStore()

/**
 * 当前 tab。默认「待学习」——学员身份远多于批阅人，
 * 少数批阅人切一次 tab 的成本，低于让所有学员先看到空的任务列表。
 */
const activeTab = ref<'learning' | 'teaching'>('learning')

/**
 * 切 tab 时按需加载。
 *
 * <p>`MarkTodoList` 用 `v-if` 挂载而不是 `v-show`：待批阅数据带权限、且批阅完就该消失，
 * 提前预加载会在每次进「我的陪练」时白打一次接口；用 `v-if` 让它只在真正切过去时才请求。
 */
const onTabChange = (name: string | number) => {
  activeTab.value = name === 'teaching' ? 'teaching' : 'learning'
}

interface TaskItem {
  id: string
  title: string
  tags: string[]
  startTime: string
  endTime: string
}

// 2026-10-02 起接入学员项目真实接口（FP-01~04），原 mockTasks 数据退役；
// 侧边栏的勋章/经验值/积分等仍为静态展示，待产品确认口径后另行接数。
const tasks = ref<TaskItem[]>([])
const loading = ref(false)

const loadTasks = async () => {
  loading.value = true
  try {
    const data = await getStudentProjects({ page: 1, pageSize: 20 })
    tasks.value = data.records.map((project) => ({
      id: String(project.projectId),
      title: project.name,
      tags: [project.projectType === 1 ? '考核' : '培训'],
      startTime: project.startTime ?? '',
      endTime: project.endTime ?? ''
    }))
  } finally {
    loading.value = false
  }
}

onMounted(loadTasks)

const getTagClass = (tag: string) => {
  const map: Record<string, string> = { '培训': 'tag-info', '重要': 'tag-danger', '考核': 'tag-danger' }
  return map[tag] || 'tag-info'
}
</script>

<style scoped lang="scss">
.my-practice { height: 100%; position: relative; }

.task-empty { padding: 48px 0; text-align: center; color: var(--color-muted); font-size: 14px; }

.layout {
  display: flex;
  height: 100%;
  gap: 24px;
}

.user-sidebar {
  width: 240px;
  background: var(--color-paper);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px color-mix(in oklab, var(--color-graphite) 5%, transparent);

  .user-avatar {
    width: 80px; height: 80px; border-radius: 50%; background: var(--color-accent-wash);
    display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
    .avatar-text { font-size: 32px; color: var(--color-accent); font-weight: 500; }
  }

  .user-name { text-align: center; font-size: 16px; font-weight: 600; color: var(--color-ink); margin: 0 0 12px 0; }

  .user-badges {
    display: flex; justify-content: center; gap: 12px; margin-bottom: 16px;
    .medal-badge { font-size: 12px; color: var(--color-warning); background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper)); padding: 4px 8px; border-radius: 4px; }
    .level-badge { font-size: 12px; color: var(--color-accent); background: var(--color-accent-wash); padding: 4px 8px; border-radius: 4px; }
  }

  .user-exp {
    margin-bottom: 20px;
    .exp-text { font-size: 12px; color: var(--color-muted); display: block; margin-bottom: 8px; strong { color: var(--color-ink); } }
  }

  .progress-bar { height: 6px; background: var(--color-rule); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--color-accent); border-radius: 3px; }

  .user-stats {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;
    .stat-item { text-align: center; }
    .stat-value { display: block; font-size: 24px; font-weight: 600; color: var(--color-ink); margin-bottom: 4px; }
    .stat-label { font-size: 12px; color: var(--color-muted); }
  }

  .user-credits {
    display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--color-paper-2);
    border-radius: 8px; margin-bottom: 20px;
    .credits-label { font-size: 14px; color: var(--color-ink); }
    .credits-value { font-size: 18px; font-weight: 600; color: var(--color-accent); margin-left: auto; }
    .credits-icon { font-size: 20px; }
  }

  .pk-ranking {
    border-top: 1px solid var(--color-rule); padding-top: 16px;
    .ranking-header { .ranking-title { font-size: 14px; font-weight: 500; color: var(--color-ink); } }
    .ranking-content { margin-top: 12px; .view-all { font-size: 12px; color: var(--color-accent); } }
  }
}

.main-content {
  flex: 1; background: var(--color-paper); border-radius: 8px; padding: 24px;
  box-shadow: 0 2px 8px color-mix(in oklab, var(--color-graphite) 5%, transparent);
}

.content-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
  .header-left { display: flex; align-items: center; gap: 16px; }
  .page-title { font-size: 20px; font-weight: 600; color: var(--color-ink); margin: 0; }
  .task-count { font-size: 14px; color: var(--color-muted); strong { color: var(--color-error); } }
}


.task-list { display: flex; flex-direction: column; gap: 16px; }

.task-card {
  border: 1px solid var(--color-rule); border-radius: 8px; padding: 20px;
  .task-tags { display: flex; gap: 8px; margin-bottom: 12px; }
  .task-title { font-size: 14px; font-weight: 500; color: var(--color-ink); margin: 0 0 8px 0; }
  .task-time { font-size: 12px; color: var(--color-muted); margin: 0; }
}

.tag {
  padding: 2px 8px; border-radius: 4px; font-size: 12px;
  &.tag-info { background: var(--color-paper-2); color: var(--color-muted); }
  &.tag-danger { background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper)); color: var(--color-error); }
}


.btn-caret { vertical-align: -2px; margin-left: 2px; font-size: 12px; }
</style>
