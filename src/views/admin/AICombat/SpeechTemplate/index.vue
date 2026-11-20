<template>
  <div class="speech-template">
    <div class="layout">
      <!-- 左侧菜单 -->
      <aside class="side-menu">
        <h3 class="menu-title">AI对练</h3>
        <div class="menu-list">
          <div class="menu-group expanded">
            <div class="menu-group-title" role="button" tabindex="0" @keydown.enter.prevent="toggleGroup('speechNew')" @click="toggleGroup('speechNew')">
              <el-icon class="group-icon" aria-hidden="true"><Refresh /></el-icon>
              <span>话术训练(新)</span>
              <span class="arrow" :class="{ open: openGroups.speechNew }" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
            </div>
            <ExpandTransition>
              <div v-if="openGroups.speechNew" class="menu-group-items">
                <router-link to="/sparring/newmanage" class="menu-item">话术训练中心</router-link>
                <router-link to="/sparring/newtemplate" class="menu-item active">话术模版</router-link>
              </div>
            </ExpandTransition>
          </div>
          <!-- 占位菜单：暂无功能，去掉可点暗示 -->
          <div class="menu-item collapsed" title="敬请期待">
            <el-icon class="group-icon" aria-hidden="true"><User /></el-icon>
            <span>演讲训练</span>
            <span class="arrow" aria-hidden="true"><el-icon><CaretRight /></el-icon></span>
          </div>
          <div class="menu-item collapsed" title="敬请期待">
            <el-icon class="group-icon" aria-hidden="true"><Trophy /></el-icon>
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
            <el-button class="btn btn-primary" @click="showCreateDialog = true">创建</el-button>
          </div>
          <div class="filter-bar">
            <el-select v-model="filters.status" class="filter-select" placeholder="全部状态" @change="resetAndFetch">
              <el-option label="全部状态" value="" />
              <el-option label="未发布" value="0" />
              <el-option label="已发布" value="1" />
              <el-option label="已撤回" value="2" />
            </el-select>
            <el-input
              v-model="filters.keyword"
              class="filter-input"
              placeholder="请输入名称搜索"
              clearable
              @keyup.enter="resetAndFetch"
            />
          </div>
        </div>

        <!-- 模板表格 -->
        <el-table :data="templates" row-key="id" class="template-table" empty-text="暂无模板">
          <el-table-column label="模板名称" min-width="180">
            <template #default="{ row }">
              <el-button link type="primary" @click="goToTemplate(row.id)">{{ row.name }}</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="170" />
          <el-table-column prop="createdBy" label="创建人" width="110" />
          <el-table-column label="模板权限" width="110">
            <template #default="{ row }">{{ row.permission === 'private' ? '仅自己' : '公开' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'published' ? 'success' : row.status === 'withdrawn' ? 'warning' : 'info'">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明信息" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button v-if="row.status === 'draft'" link type="primary" @click="goToTemplate(row.id)">
                流程设计
              </el-button>
              <el-button link type="primary">安排训练</el-button>
              <el-button link type="primary">导出数据</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页器 -->
        <div class="pagination">
          <span class="total">共 {{ total }} 条</span>
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="50"
            :total="total"
            layout="prev, pager, next"
            background
            @current-change="fetchTemplates"
          />
        </div>
      </main>
    </div>

    <!-- 创建模板弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建模板" width="500px" append-to-body>
      <el-form label-position="top">
        <el-form-item label="模板名称" required>
          <el-input v-model="newTemplate.name" placeholder="请输入模板名称" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="模板说明" required>
          <el-input
            v-model="newTemplate.description"
            type="textarea"
            placeholder="请输入模板说明"
            maxlength="1000"
            show-word-limit
            :rows="4"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CaretRight, Refresh, User, Trophy } from '@element-plus/icons-vue'
import { ref, reactive, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import { useRouter } from 'vue-router'
import { getTemplateList, createTemplate } from '@/api/template'
import { toTemplateCard } from '@/utils/convert'
import ExpandTransition from '@/components/common/ExpandTransition.vue'
import type { TemplateCard } from '@/utils/convert'

const router = useRouter()
const showCreateDialog = ref(false)
const openGroups = reactive({ speechNew: true })
const loading = ref(false)

const newTemplate = ref({ name: '', description: '' })
const templates = ref<TemplateCard[]>([])
const total = ref(0)
const currentPage = ref(1)
const filters = ref({
  status: '' as '' | '0' | '1' | '2',
  keyword: ''
})

const fetchTemplates = async () => {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize: 50 }
    if (filters.value.status !== '') params.status = Number(filters.value.status)
    if (filters.value.keyword.trim()) params.keyword = filters.value.keyword.trim()
    const res: any = await getTemplateList(params)
    templates.value = (res.records || []).map(toTemplateCard)
    total.value = res.total || 0
  } catch { /* handled */ }
  finally { loading.value = false }
}

const resetAndFetch = () => {
  currentPage.value = 1
  void fetchTemplates()
}

onMounted(fetchTemplates)

const toggleGroup = (key: string) => {
  (openGroups as any)[key] = !(openGroups as any)[key]
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    published: 'status-published',
    draft: 'status-draft',
    withdrawn: 'status-withdrawn'
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    published: '已发布',
    draft: '未发布',
    withdrawn: '已撤回'
  }
  return map[status] || status
}

const goToTemplate = (id: number) => {
  router.push(`/sparring/newtemplate/console/${id}`)
}

const handleCreate = async () => {
  if (!newTemplate.value.name) { toast.warn('请输入模板名称'); return }
  if (!newTemplate.value.description) { toast.warn('请输入模板说明'); return }
  try {
    await createTemplate({ name: newTemplate.value.name, description: newTemplate.value.description, permission: 0 })
    showCreateDialog.value = false
    newTemplate.value = { name: '', description: '' }
    fetchTemplates()
  } catch { /* handled */ }
}
</script>

<style scoped lang="scss">
.speech-template { height: 100%; }

.layout {
  display: flex;
  height: 100%;
  background: var(--color-paper);
  border-radius: 8px;
  overflow: hidden;
}

.side-menu {
  width: 200px;
  border-right: 1px solid var(--color-rule);

  .menu-title {
    padding: 16px 20px;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0;
    border-bottom: 1px solid var(--color-rule);
  }
}

.menu-list {
  .menu-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 14px;
    color: var(--color-ink);
    cursor: pointer;

    &:hover { background: var(--color-paper-2); }
    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
    .arrow { font-size: 10px; margin-left: auto; }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px 10px 40px;
  font-size: 14px;
  color: var(--color-muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-decoration: none;

  &:hover { background: var(--color-paper-2); color: var(--color-accent); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
  &.active { background: var(--color-accent-wash); color: var(--color-accent); border-right: 3px solid var(--color-accent); }
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

.filter-bar { display: flex; gap: 12px; align-items: center; }

.filter-select, .filter-input {
  height: 32px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-ink);

  &:focus { border-color: var(--color-accent); }
}

.filter-input { width: 200px; }

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
  border: 1px solid var(--color-rule-2);

  &.btn-primary { background: var(--color-accent); color: var(--color-paper); border-color: var(--color-accent); }
  &.btn-default { background: var(--color-paper); color: var(--color-ink); }
  &.btn-link { background: none; border: none; color: var(--color-accent); padding: 0; }.btn-link { background: none; border: none; color: var(--color-accent-deep); padding: 0; }
  &:hover { opacity: 0.85; }
}

.template-table {
  /* t23 表格规范：表头 paper-2 灰底+500 字、行 hairline+44px+hover wash、单元格 nowrap */
  :deep(.el-table__header th) {
    background: var(--color-paper-2);
    color: var(--color-ink-2);
    font-size: 13px;
    font-weight: 500;
  }
  :deep(.el-table__row td) {
    height: 44px;
    border-bottom: 1px solid var(--color-rule);
  }
  :deep(.el-table .cell) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :deep(.el-table__row:hover > td) { background: var(--color-accent-wash) !important; }
  border: 1px solid var(--color-rule);
  border-radius: 4px;
  margin-bottom: 24px;
  .col-action { width: 200px; display: flex; gap: 12px; }
}

.template-link {
  color: var(--color-accent);
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.status-published { background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper)); color: var(--color-success); }
  &.status-draft { background: var(--color-paper-2); color: var(--color-muted); }
  &.status-withdrawn { background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper)); color: var(--color-warning); }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;

  .total { font-size: 14px; color: var(--color-muted); }
}

.page-buttons { display: flex; gap: 8px; }

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  cursor: pointer;
  font-size: 14px;

  &:hover { color: var(--color-accent); border-color: var(--color-accent); }
  &.active { background: var(--color-accent); color: var(--color-paper); border-color: var(--color-accent); }
  &:disabled { color: var(--color-rule-2); cursor: not-allowed; }
}

// 弹窗样式
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in oklab, var(--color-graphite) 50%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--color-paper);
  border-radius: 8px;
  width: 500px;
  max-height: 80vh;
  overflow: hidden;

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-rule);

    .dialog-title { font-size: 16px; font-weight: 500; color: var(--color-ink); }
    .close-btn { font-size: 20px; color: var(--color-muted); cursor: pointer; }
  }

  .dialog-content {
    padding: 24px;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--color-rule);
  }
}

.form-item {
  margin-bottom: 16px;

  .form-label {
    display: block;
    font-size: 14px;
    color: var(--color-ink);
    margin-bottom: 8px;

    &.required::after {
      content: ' *';
      color: var(--color-error);
    }
  }
}

.form-input, .form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  font-size: 14px;
  outline: none;

  &:focus { border-color: var(--color-accent); }
}

.form-textarea { resize: vertical; min-height: 100px; }
</style>
