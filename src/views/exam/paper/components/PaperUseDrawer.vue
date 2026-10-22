<template>
  <!-- FP-11 引用次数抽屉（截图24）：表格列 + 类型筛选 + 导出 -->
    <el-drawer
    :model-value="true"
    size="720px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>引用次数</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <el-select v-model="sourceType" class="filter-select">
            <el-option :value="-1" label="全部类型" />
            <el-option :value="1" label="课程安排" />
            <el-option :value="2" label="单独安排" />
          </el-select>
          <span class="count">共 {{ filtered.length }} 条引用</span>
          <el-button class="btn" :disabled="!filtered.length" @click="exportCsv">导出数据</el-button>
        </div>

        <div class="table-wrap">
          <el-table v-loading="loading" :data="filtered" row-key="id" empty-text="该试卷暂未被引用">
            <el-table-column label="引用方" min-width="180"><template #default="{ row }">{{ row.refName || '--' }}</template></el-table-column>
            <el-table-column label="类型" width="110"><template #default="{ row }">{{ row.sourceType === 2 ? '单独安排' : '课程安排' }}</template></el-table-column>
            <el-table-column label="创建人" width="130"><template #default="{ row }">{{ row.creatorName || '--' }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template #default="{ row }">{{ row.status || '--' }}</template></el-table-column>
            <el-table-column label="时间" width="170"><template #default="{ row }">{{ row.createdAt || '--' }}</template></el-table-column>
          </el-table>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn primary" @click="emit('close')">关闭</el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getPaperUseList, type PaperUseItem } from '@/api/paper'

/** FP-11 引用次数抽屉：数据来自考试模块回填的 exam_paper_use。 */
const props = defineProps<{ paperId: string }>()
const emit = defineEmits<{ close: [] }>()

const rows = ref<PaperUseItem[]>([])
const sourceType = ref(-1)
const loading = ref(false)

const filtered = computed(() => sourceType.value < 0
  ? rows.value
  : rows.value.filter(r => r.sourceType === sourceType.value))

/** 导出为 CSV（前端直接生成，避免为一张小表再加一个后端导出接口）。 */
const exportCsv = () => {
  const header = ['引用方', '类型', '创建人', '状态', '时间']
  const lines = [header.join(',')].concat(filtered.value.map(r => [
    r.refName, r.sourceType === 2 ? '单独安排' : '课程安排', r.creatorName, r.status, r.createdAt
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')))
  // 加 BOM 让 Excel 正确识别 UTF-8 中文
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '试卷引用记录.csv'
  link.click()
  URL.revokeObjectURL(url)
  toast.success('导出已开始下载')
}

onMounted(async () => {
  loading.value = true
  try {
    rows.value = await getPaperUseList(props.paperId)
  } catch { /* 拦截器已提示 */ } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.drawer { width: 720px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 14px 20px; }

.filter-row {
  display: flex; align-items: center; gap: 10px;

  .filter-select { border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; }
  .count { font-size: 12px; color: #8a92a5; }
  .btn { margin-left: auto; }
}

.table-wrap { flex: 1; min-height: 0; overflow: auto; border: 1px solid #e6eaf1; border-radius: 6px; }

table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f2f4f8; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
tr:hover td { background: #fafbfe; }

.col-sm { white-space: nowrap; }
.col-user { white-space: nowrap; }
.col-time { white-space: nowrap; color: #667; }
.empty-cell { text-align: center; color: #b0b7c3; padding: 44px 0; }

.drawer-footer { display: flex; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid #eee; }

.btn {
  padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
