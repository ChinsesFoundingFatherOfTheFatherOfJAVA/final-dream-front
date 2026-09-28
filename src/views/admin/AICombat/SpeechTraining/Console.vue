<template>
  <div class="project-console">
    <!-- 顶部项目信息 -->
    <div class="project-header">
      <div class="project-info">
        <div class="project-cover">
          <img v-if="project.coverImage" :src="project.coverImage" alt="cover" class="cover-img" />
          <span v-else class="cover-icon">📚</span>
        </div>
        <div class="project-details">
          <h1 class="project-name">{{ project.name }}</h1>
          <div class="project-tags">
            <span class="status-tag" :class="project.status === 'published' ? 'tag-published' : 'tag-draft'">
              {{ project.status === 'published' ? '已发布' : '未发布' }}
            </span>
            <span class="type-tag tag-project">{{ project.assignType === 'project' ? '项目安排' : '单独安排' }}</span>
            <span class="mode-tag" :class="project.type === 'train' ? 'tag-train' : 'tag-examine'">
              {{ project.type === 'train' ? '日常训练' : '通关考核' }}
            </span>
          </div>
          <div class="project-meta">
            <span class="meta-item">负责人: {{ project.createdByName || project.createdBy || '--' }}</span>
            <span class="meta-item">起止时间: {{ project.startTime }} ~ {{ project.endTime }}</span>
          </div>
        </div>
        <div class="project-actions">
          <button v-if="isOwner" class="btn btn-default" @click="handlePublish">
            {{ project.status === 'published' ? '撤回' : '发布' }}
          </button>
          <button class="btn btn-default">预览</button>
          <button v-if="isOwner" class="btn btn-danger" @click="handleDelete">删除</button>
        </div>
      </div>
    </div>

    <div class="console-content">
      <!-- 左侧菜单 -->
      <aside class="console-menu">
        <router-link :to="`/sparring/newmanage/console/${projectId}/overview`" class="menu-item" :class="{ active: currentMenu === 'overview' }">
          整体概览
        </router-link>
        <router-link :to="`/sparring/newmanage/console/${projectId}/student`" class="menu-item" :class="{ active: currentMenu === 'student' }">
          学员管理
        </router-link>
        <router-link :to="`/sparring/newmanage/console/${projectId}/flow`" class="menu-item" :class="{ active: currentMenu === 'flow' }">
          流程设计
        </router-link>
        <router-link :to="`/sparring/newmanage/console/${projectId}/basic`" class="menu-item" :class="{ active: currentMenu === 'basic' }">
          基本信息
        </router-link>
      </aside>

      <!-- 主内容区 -->
      <main class="console-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getProjectDetail, publishProject, withdrawProject, deleteProject } from '@/api/project'
import { resolveAssetUrl } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { toStatus, toProjectType, toAssignType } from '@/utils/convert'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const projectId = computed(() => Number(route.params.id))

const currentMenu = computed(() => {
  const path = route.path
  if (path.includes('overview')) return 'overview'
  if (path.includes('student')) return 'student'
  if (path.includes('flow')) return 'flow'
  if (path.includes('basic')) return 'basic'
  return 'flow'
})

const project = ref({
  id: 0,
  name: '',
  type: 'train',
  status: 'draft',
  assignType: 'project',
  createdBy: '',
  createdByName: '',
  startTime: '',
  endTime: '',
  coverImage: null as string | null
})

const isOwner = computed(() => {
  const currentIds = [auth.user?.userId, auth.user?.account].filter(Boolean)
  return Boolean(project.value.createdBy && currentIds.includes(project.value.createdBy))
})

const loadProject = async () => {
  try {
    const res: any = await getProjectDetail(projectId.value)
    project.value = {
      id: res.id,
      name: res.name || '',
      type: toProjectType(res.projectType),
      status: toStatus(res.status),
      assignType: toAssignType(res.assignType),
      createdBy: res.createdBy || '',
      createdByName: res.createdByName || '',
      startTime: (res.startTime || '').replace('T', ' ').slice(0, 16),
      endTime: (res.endTime || '').replace('T', ' ').slice(0, 16),
      coverImage: resolveAssetUrl(res.coverImage) || null
    }
  } catch { /* handled */ }
}

const handlePublish = async () => {
  try {
    if (project.value.status === 'published') {
      await withdrawProject(projectId.value)
      project.value.status = 'draft'
    } else {
      await publishProject(projectId.value)
      project.value.status = 'published'
    }
  } catch { /* handled */ }
}

const handleDelete = async () => {
  if (!confirm('确定要删除这个项目吗？')) return
  try {
    await deleteProject(projectId.value)
    router.push('/sparring/newmanage')
  } catch { /* handled */ }
}

onMounted(loadProject)
</script>

<style scoped lang="scss">
.project-console {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.project-header {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.project-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.project-cover {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  .cover-icon { font-size: 28px; }

  .cover-img { width: 100%; height: 100%; object-fit: cover; }
}

.project-details {
  flex: 1;

  .project-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
  }

  .project-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .project-meta {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: #666;
  }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.tag-published { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
  &.tag-draft { background: #f5f5f5; color: #999; border: 1px solid #d9d9d9; }
}

.type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.tag-project { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
  &.tag-single { background: #fff7e6; color: #faad14; border: 1px solid #ffd591; }
}

.mode-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.tag-train { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
  &.tag-examine { background: #fff7e6; color: #faad14; border: 1px solid #ffd591; }
}

.project-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d9d9d9;

  &.btn-default { background: #fff; color: #333; }
  &.btn-danger { background: #fff; color: #f5222d; border-color: #f5222d; }
  &:hover { opacity: 0.85; }
}

.console-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.console-menu {
  width: 160px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  padding: 16px 0;

  .menu-item {
    display: block;
    padding: 12px 24px;
    font-size: 14px;
    color: #666;
    text-decoration: none;
    transition: all 0.2s;

    &:hover { background: #f5f5f5; color: #1890ff; }
    &.active { color: #1890ff; border-right: 3px solid #1890ff; background: #e6f7ff; }
  }
}

.console-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

@media (max-width: 760px) {
  .project-console {
    height: auto;
    min-height: 100vh;
  }

  .project-header {
    padding: 16px 12px;
  }

  .project-info {
    flex-wrap: wrap;
  }

  .project-details {
    min-width: 0;

    .project-name {
      overflow-wrap: anywhere;
    }

    .project-tags {
      flex-wrap: wrap;
    }

    .project-meta {
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
    }
  }

  .project-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .console-content {
    flex-direction: column;
    overflow: visible;
  }

  .console-menu {
    width: 100%;
    display: flex;
    overflow-x: auto;
    box-sizing: border-box;
    padding: 0 12px;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;

    .menu-item {
      flex-shrink: 0;
      padding: 12px 16px;
      border-bottom: 2px solid transparent;

      &.active {
        border-right: none;
        border-bottom-color: #1890ff;
      }
    }
  }

  .console-main {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    overflow: visible;
  }
}
</style>
