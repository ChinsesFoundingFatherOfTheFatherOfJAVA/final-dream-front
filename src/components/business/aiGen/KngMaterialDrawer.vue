<template>
  <!-- SG-03 从在线课堂选择抽屉：960px，仅名称搜索（极简口径），列=名称/学分/时长/分享人 -->
  <el-drawer
    :model-value="true"
    size="960px"
    :with-header="false"
    :z-index="props.zIndex"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>课程库中的</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>
      <div class="drawer-body">
        <div class="filter-row">
          <el-input
            v-model.trim="keyword"
            class="keyword-input"
            placeholder="搜索课件名称"
            clearable
            @keyup.enter="reload(1)"
          >
            <template #prefix><span>⌕</span></template>
          </el-input>
          <el-button type="primary" class="search-btn" @click="reload(1)">搜索</el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="page.records"
          row-key="id"
          class="material-table"
          empty-text="暂无文档类课件"
        >
          <el-table-column width="44" align="center">
            <template #header>
              <el-checkbox
                :model-value="allPageChecked"
                :indeterminate="somePageChecked"
                @change="toggleAllPage(Boolean($event))"
              />
            </template>
            <template #default="{ row }">
              <el-checkbox
                :model-value="selected.has(row.id)"
                @change="toggleRow(row, Boolean($event))"
              />
            </template>
          </el-table-column>
          <el-table-column label="名称" min-width="280">
            <template #default="{ row }">
              <span class="title-text" :title="row.title">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="学分" width="100">
            <template #default="{ row }">{{ row.credits ?? '--' }}</template>
          </el-table-column>
          <el-table-column label="时长" width="130">
            <template #default="{ row }">{{ row.durationText || '--' }}</template>
          </el-table-column>
          <el-table-column label="分享人" width="140">
            <template #default="{ row }">{{ row.createdByName || '--' }}</template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <span>共 {{ page.total }} 条</span>
          <el-pagination
            :current-page="pageNo"
            :page-size="pageSize"
            :total="page.total"
            layout="prev, pager, next"
            background
            @current-change="reload"
          />
        </div>
      </div>
      <div class="drawer-footer">
        <span class="selected-count">已选择：{{ selected.size }}</span>
        <div class="footer-btns">
          <el-button @click="emit('close')">取消</el-button>
          <el-button type="primary" :disabled="!selected.size" @click="confirmPick">确定</el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { listKngMaterials, type KngMaterialItem } from '@/api/aiGen'

/**
 * AI生成话术-在线课堂素材选择抽屉（SG-03）。
 * 数据源=/admin/ai/material/kng-list（后端只返回已发布+文档类源文件课件，故无"不可勾选"行）；
 * 抽屉骨架复用课程设计器 CoursewarePickerDrawer 的布局约定（960px/checkbox 多选/已选择 N）。
 */
const props = defineProps<{
  zIndex?: number
  /** 已选课件 id（防重复添加） */
  excludeIds?: string[]
}>()

const emit = defineEmits<{
  close: []
  confirm: [rows: KngMaterialItem[]]
}>()

const keyword = ref('')
const pageNo = ref(1)
const pageSize = 20
const loading = ref(false)
const page = reactive<{ total: number; records: KngMaterialItem[] }>({ total: 0, records: [] })
const selected = ref(new Map<string, KngMaterialItem>())

const allPageChecked = computed(
  () => page.records.length > 0 && page.records.every((row) => selected.value.has(row.id))
)
const somePageChecked = computed(
  () => page.records.some((row) => selected.value.has(row.id)) && !allPageChecked.value
)

const reload = async (nextPage?: number) => {
  if (nextPage) pageNo.value = nextPage
  loading.value = true
  try {
    const res: any = await listKngMaterials(pageNo.value, pageSize, keyword.value)
    page.total = res.total || 0
    page.records = res.records || []
  } finally {
    loading.value = false
  }
}

const toggleRow = (row: KngMaterialItem, checked: boolean) => {
  if (checked) selected.value.set(row.id, row)
  else selected.value.delete(row.id)
}

const toggleAllPage = (checked: boolean) => {
  for (const row of page.records) {
    if (checked) selected.value.set(row.id, row)
    else selected.value.delete(row.id)
  }
}

const confirmPick = () => {
  const rows = Array.from(selected.value.values())
    .filter((row) => !(props.excludeIds || []).includes(row.id))
  emit('confirm', rows)
}

onMounted(() => reload(1))
</script>

<style scoped lang="scss">
.drawer {
  width: 960px;
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
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  gap: 10px;

  .keyword-input { flex: 1; }
  .search-btn { min-width: 76px; }
}

.material-table {
  flex: 1;
  min-height: 0;
  font-size: 13px;

  :deep(.el-table__header th) {
    background: #fafafa;
    color: #666;
    font-weight: 500;
  }
}

.title-text {
  max-width: 380px;
  display: inline-block;
  overflow: hidden;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  color: #666;
  font-size: 13px;
}

.drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid #eee;

  .selected-count { font-size: 13px; color: #666; }
}

.footer-btns { display: flex; gap: 10px; }

</style>
