<template>
  <div class="speech-training">
    <div class="layout">
      <!-- 左侧菜单 -->
      <aside class="side-menu">
        <h3 class="menu-title">AI对练</h3>
        <div class="menu-list">
          <div class="menu-group expanded">
            <div class="menu-group-title" role="button" tabindex="0" @keydown.enter.prevent="toggleGroup('speechNew')" @click="toggleGroup('speechNew')">
              <span class="group-icon" aria-hidden="true">🔄</span>
              <span>话术训练(新)</span>
              <span class="arrow" :class="{ open: openGroups.speechNew }" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
            </div>
            <div v-if="openGroups.speechNew" class="menu-group-items">
              <router-link to="/sparring/newmanage" class="menu-item active">话术训练中心</router-link>
              <router-link to="/sparring/newtemplate" class="menu-item">话术模版</router-link>
            </div>
          </div>
          <!-- 占位菜单：暂无功能，去掉可点暗示 -->
          <div class="menu-item collapsed" title="敬请期待">
            <span class="group-icon" aria-hidden="true">🔄</span>
            <span>话术训练</span>
            <span class="arrow" aria-hidden="true"><el-icon><CaretRight /></el-icon></span>
          </div>
          <div class="menu-item collapsed" title="敬请期待">
            <span class="group-icon" aria-hidden="true">👥</span>
            <span>演讲训练</span>
            <span class="arrow" aria-hidden="true"><el-icon><CaretRight /></el-icon></span>
          </div>
          <div class="menu-item collapsed" title="敬请期待">
            <span class="group-icon" aria-hidden="true">⚔️</span>
            <span>实战演练</span>
            <span class="arrow" aria-hidden="true"><el-icon><CaretRight /></el-icon></span>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 操作栏 -->
        <div class="action-bar">
          <div class="action-buttons">
            <el-dropdown trigger="click" @command="goToCreate">
              <el-button class="btn btn-primary">
                创建 <span class="arrow" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="train">日常训练：一对一训练加强话术标准程度</el-dropdown-item>
                  <el-dropdown-item command="examine">通关考核：考察学员话术标准是否达标</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button class="btn btn-default">导出</el-button>
          </div>
          <div class="filter-bar">
            <el-select v-model="filters.responsible" class="filter-select">
              <el-option label="我负责的" value="" />
              <el-option label="我负责的" value="mine" />
            </el-select>
            <el-select v-model="filters.status" class="filter-select" placeholder="全部状态" @change="fetchProjects">
              <el-option label="全部状态" value="" />
              <el-option label="未发布" value="0" />
              <el-option label="已发布" value="1" />
            </el-select>
            <el-select v-model="filters.projectType" class="filter-select" placeholder="全部类型" @change="fetchProjects">
              <el-option label="全部类型" value="" />
              <el-option label="日常训练" value="0" />
              <el-option label="通关考试" value="1" />
            </el-select>
            <el-input
              v-model="filters.keyword"
              class="filter-input"
              placeholder="请输入名称搜索"
              clearable
              @keyup.enter="fetchProjects"
            />
          </div>
        </div>

        <!-- 项目卡片网格 -->
        <div class="card-grid">
          <div v-for="project in projects" :key="project.id" class="project-card" role="button" tabindex="0" @keydown.enter.prevent="goToConsole(project.id)" @click="goToConsole(project.id)">
            <div class="card-cover">
              <img v-if="project.coverImage" :src="project.coverImage" :alt="project.name" loading="lazy" class="cover-img" />
              <span class="cover-tag" :class="project.assignType === 'project' ? 'tag-project' : 'tag-single'">
                {{ project.assignType === 'project' ? '项目安排' : '单独安排' }}
              </span>
              <span class="cover-status" :class="project.status === 'published' ? 'status-published' : 'status-draft'">
                {{ project.status === 'published' ? '已发布' : '未发布' }}
              </span>
            </div>
            <div class="card-content">
              <div class="card-tags">
                <span class="type-tag" :class="project.type === 'train' ? 'tag-train' : 'tag-examine'">
                  {{ project.type === 'train' ? '训' : '考' }}
                </span>
              </div>
              <h4 class="card-title">{{ project.name }}</h4>
              <p class="card-time">{{ project.startTime }} 至 {{ project.endTime }}</p>
            </div>
          </div>
        </div>

        <!-- 分页器 -->
        <div class="pagination">
          <span class="total">共 {{ pagination.total }} 条</span>
          <el-pagination
            v-model:current-page="pagination.page"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            layout="prev, pager, next"
            background
            @current-change="fetchProjects"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CaretRight } from '@element-plus/icons-vue'
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectList } from '@/api/project'
import { toProjectCard } from '@/utils/convert'
import type { ProjectCard } from '@/utils/convert'

const router = useRouter()
const openGroups = reactive({ speechNew: true })
const loading = ref(false)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const projects = ref<ProjectCard[]>([])
const filters = ref({
  responsible: '',
  status: '' as '' | '0' | '1',
  projectType: '' as '' | '0' | '1',
  keyword: ''
})

const fetchProjects = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    }
    if (filters.value.status !== '') params.status = Number(filters.value.status)
    if (filters.value.projectType !== '') params.projectType = Number(filters.value.projectType)
    if (filters.value.keyword.trim()) params.keyword = filters.value.keyword.trim()
    if (filters.value.responsible === 'mine') {
      // 人员功能未完成，先不带此参数；切换条件时不主动调用，下面独立处理
    }
    const res: any = await getProjectList(params)
    projects.value = (res.records || []).map(toProjectCard)
    pagination.value.total = res.total || 0
  } catch { /* handled by interceptor */ }
  finally { loading.value = false }
}

onMounted(fetchProjects)

const toggleGroup = (key: string) => {
  (openGroups as any)[key] = !(openGroups as any)[key]
}

const goToCreate = (type: string) => {
  router.push({ path: '/sparring/newmanage/edit2', query: { type } })
}

const goToConsole = (id: number) => {
  router.push(`/sparring/newmanage/console/${id}`)
}
</script>

<style scoped lang="scss">
.speech-training { height: 100%; }

.layout {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.side-menu {
  width: 200px;
  border-right: 1px solid #e8e8e8;

  .menu-title {
    padding: 16px 20px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    border-bottom: 1px solid #e8e8e8;
  }
}

.menu-list {
  .menu-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 14px;
    color: #333;
    cursor: pointer;

    &:hover { background: #f5f5f5; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
    .arrow { font-size: 10px; margin-left: auto; }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px 10px 40px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-decoration: none;

  &:hover { background: #f5f5f5; color: #1890ff; }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
  &.active { background: #e6f7ff; color: #1890ff; border-right: 3px solid #1890ff; }
  &.collapsed {
    padding-left: 20px;
    /* 占位入口：暂无功能，不做可点暗示 */
    cursor: default;
    &:hover { background: none; color: inherit; }
  }
  .arrow { font-size: 10px; margin-left: auto; }
  .group-icon { font-size: 16px; }
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.action-buttons { display: flex; gap: 12px; }

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
  border: 1px solid #d9d9d9;

  &.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
  &.btn-default { background: #fff; color: #333; }
  &:hover { opacity: 0.85; }
  .arrow { font-size: 10px; margin-left: 4px; }
}

.filter-bar { display: flex; gap: 12px; align-items: center; }

.filter-select, .filter-input {
  border-radius: 4px;
  font-size: 14px;
  color: #333;

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    min-height: 32px;
  }
}

.filter-input { width: 200px; }

.filter-select { width: 130px; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.project-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: box-shadow 0.3s, transform 0.3s;

  &:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); transform: translateY(-2px); }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; }

  .card-cover {
    height: 160px;
    background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px;

    .cover-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cover-tag {
      align-self: flex-start;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #fff;
      position: relative;
      z-index: 1;

      &.tag-project { background: #1890ff; }
      &.tag-single { background: #faad14; }
    }

    .cover-status {
      align-self: flex-start;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      position: relative;
      z-index: 1;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }
  }

  .card-content {
    padding: 16px;
    .card-tags { display: flex; gap: 8px; margin-bottom: 8px; }
    .card-title { font-size: 14px; font-weight: 500; color: #333; margin: 0 0 8px 0; }
    .card-time { font-size: 12px; color: #999; margin: 0; }
  }
}

.type-tag {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  text-align: center;
  line-height: 20px;
  font-size: 12px;
  color: #fff;

  &.tag-train { background: #1890ff; }
  &.tag-examine { background: #faad14; }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;

  .total { font-size: 14px; color: #666; }
}

@media (max-width: 760px) {
  .side-menu {
    display: none;
  }

  .main-content {
    width: 100%;
    min-width: 0;
    padding: 0;
    overflow-y: visible;
  }

  .action-bar {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .action-buttons {
    flex-wrap: wrap;
  }

  .filter-bar {
    flex-wrap: wrap;
  }

  .filter-input {
    width: 100%;
    box-sizing: border-box;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .pagination {
    justify-content: space-between;
  }
}
</style>
