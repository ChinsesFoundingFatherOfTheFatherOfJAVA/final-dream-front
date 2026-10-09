<template>
  <!-- SG-03 从在线课堂选择抽屉：960px，仅名称搜索（极简口径），列=名称/学分/时长/分享人 -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>课程库中的</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>
      <div class="drawer-body">
        <div class="filter-row">
          <label class="keyword-box">
            <span>⌕</span>
            <input v-model.trim="keyword" type="search" placeholder="搜索课件名称" @keyup.enter="reload(1)" />
          </label>
          <button class="search-btn" @click="reload(1)">搜索</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="check-col">
                  <input
                    type="checkbox"
                    :checked="allPageChecked"
                    :indeterminate.prop="somePageChecked"
                    @change="toggleAllPage(($event.target as HTMLInputElement).checked)"
                  />
                </th>
                <th>名称</th>
                <th>学分</th>
                <th>时长</th>
                <th>分享人</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in page.records" :key="row.id" :class="{ checked: selected.has(row.id) }">
                <td class="check-col">
                  <input
                    type="checkbox"
                    :checked="selected.has(row.id)"
                    @change="toggleRow(row, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td class="title-cell"><span class="title-text" :title="row.title">{{ row.title }}</span></td>
                <td>{{ row.credits ?? '--' }}</td>
                <td>{{ row.durationText || '--' }}</td>
                <td>{{ row.createdByName || '--' }}</td>
              </tr>
              <tr v-if="!loading && !page.records.length">
                <td colspan="5" class="empty-cell">暂无文档类课件</td>
              </tr>
            </tbody>
          </table>
          <div v-if="loading" class="table-loading">加载中...</div>
        </div>

        <div class="pagination">
          <button :disabled="pageNo <= 1" @click="reload(pageNo - 1)">上一页</button>
          <span>{{ pageNo }} / {{ Math.max(1, Math.ceil(page.total / pageSize)) }}</span>
          <button :disabled="pageNo >= Math.ceil(page.total / pageSize)" @click="reload(pageNo + 1)">下一页</button>
        </div>
      </div>
      <div class="drawer-footer">
        <span class="selected-count">已选择：{{ selected.size }}</span>
        <div class="footer-btns">
          <button class="btn" @click="emit('close')">取消</button>
          <button class="btn primary" :disabled="!selected.size" @click="confirmPick">确定</button>
        </div>
      </div>
    </div>
  </div>
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
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: v-bind('props.zIndex || 3100');
  display: flex;
  justify-content: flex-end;
}

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

.filter-row { display: flex; gap: 10px; }

.keyword-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 0 10px;

  span { color: #999; }
  input {
    flex: 1;
    border: none;
    outline: none;
    padding: 8px 0;
    font-size: 13px;
  }
}

.search-btn {
  padding: 0 18px;
  border: none;
  border-radius: 6px;
  background: #6b5ce7;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover { opacity: 0.9; }
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

table { width: 100%; border-collapse: collapse; font-size: 13px; }

th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f5f5f5;
}

th { background: #fafafa; color: #666; font-weight: 500; }
tr.checked { background: #f6f4ff; }
tr:hover { background: #fafafa; }

.check-col { width: 40px; }
.title-cell .title-text {
  max-width: 380px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}

.empty-cell { text-align: center; color: #999; padding: 32px 0; }
.table-loading { position: absolute; inset: 0; background: rgba(255,255,255,.7); display: flex; align-items: center; justify-content: center; color: #999; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  font-size: 13px;
  color: #666;

  button {
    padding: 4px 10px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
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

.btn {
  padding: 7px 18px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &.primary { background: #6b5ce7; border-color: #6b5ce7; color: #fff; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
