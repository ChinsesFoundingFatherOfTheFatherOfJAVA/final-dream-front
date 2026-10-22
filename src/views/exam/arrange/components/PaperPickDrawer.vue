<template>
  <!-- F16 选择试卷抽屉：分类下拉 + 名称搜索 + 列表单选 -->
    <el-drawer
    :model-value="true"
    size="900px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>选择试卷</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <el-select v-model="catalogId" class="filter-select" @change="reload(1)">
            <el-option value="root" label="全部分类" />
            <el-option v-for="c in flatCatalogs" :key="c.id" :value="c.id" :label="'　'.repeat(c.level) + c.name" />
          </el-select>
          <el-input v-model.trim="keyword" placeholder="请输入试卷名称搜索" @keyup.enter="reload(1)" />
          <el-button class="btn primary" @click="reload(1)">查询</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="records" row-key="id" empty-text="没有可选试卷" @row-click="(row: any) => picked = row">
            <el-table-column width="44" align="center">
              <template #default="{ row }">
                <el-radio :model-value="picked?.id" :value="row.id" @change="picked = row" />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="试卷名称" min-width="200" show-overflow-tooltip />
            <el-table-column label="出卷方式" width="110"><template #default="{ row }">{{ row.buildType === 1 ? '随机出卷' : '固定出卷' }}</template></el-table-column>
            <el-table-column prop="totalQuesQty" label="试题数" width="90" />
            <el-table-column prop="totalScore" label="总分" width="90" />
            <el-table-column label="试卷状态" width="110">
              <template #default="{ row }">
                  <span :class="['tag', row.status === 4 ? 'ok' : 'warn']">{{ row.status === 4 ? '已发布' : '未发布' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="更新日期" width="170" />
          </el-table>
        </div>

        <p v-if="picked && picked.status !== 4" class="warn">
          该试卷尚未发布，发布考试时会自动发布它（需已有题目/策略和分值）。
        </p>

        <div class="pagination">
          <span>共 {{ total }} 条</span>
          <el-pagination v-model:current-page="pageNo" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="reload" />
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!picked" @click="confirm">确定</el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPaperCatalogTree, getPaperList, type PaperCatalogTreeNode, type PaperItem } from '@/api/paper'

const emit = defineEmits<{ close: []; picked: [paper: PaperItem] }>()

const records = ref<PaperItem[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 10
const keyword = ref('')
const catalogId = ref('root')
const picked = ref<PaperItem | null>(null)
const treeRoot = ref<PaperCatalogTreeNode | null>(null)

interface FlatNode extends PaperCatalogTreeNode { level: number }
const flatCatalogs = computed<FlatNode[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatNode[] = []
  const walk = (n: PaperCatalogTreeNode, level: number) => {
    out.push({ ...n, level })
    for (const c of n.children || []) walk(c, level + 1)
  }
  walk(treeRoot.value, 0)
  return out
})

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  try {
    const res = await getPaperList(pageNo.value, pageSize, 'updateTime', 'desc', {
      queryType: 0, keyword: keyword.value, catalogId: catalogId.value, routingPath: '',
      creatorUserId: '', buildType: -1, disabled: -1, status: -1
    })
    records.value = res.records || []
    total.value = res.total || 0
  } catch { /* 拦截器已提示 */ }
}

const confirm = () => {
  if (picked.value) emit('picked', picked.value)
}

onMounted(async () => {
  try {
    treeRoot.value = await getPaperCatalogTree() as any
  } catch { /* 拦截器已提示 */ }
  reload(1)
})
</script>

<style scoped lang="scss">
.drawer { width: 900px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600; .close-btn { font-size: 22px; color: #999; cursor: pointer; } }
.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 20px; gap: 12px; }
.filter-row { display: flex; gap: 10px; .filter-select { width: 220px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 7px 10px; font-size: 13px; } input { flex: 1; border: 1px solid #d9d9d9; border-radius: 4px; padding: 7px 10px; font-size: 13px; outline: none; } }
.table-wrap { flex: 1; min-height: 0; overflow: auto; border: 1px solid #eef1f6; border-radius: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #f2f4f8; }
th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
tr { cursor: pointer; &:hover td { background: #fafbfe; } &.picked td { background: #f0f8ff; } }
.check-col { width: 40px; text-align: center; }
.col-name { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-sm { min-width: 90px; white-space: nowrap; }
.col-time { min-width: 150px; white-space: nowrap; color: #667; }
.tag { padding: 1px 6px; border-radius: 3px; font-size: 11px; &.ok { background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; } &.warn { background: #fff7e6; border: 1px solid #ffd591; color: #d46b08; } }
.warn { margin: 0; padding: 8px 10px; background: #fff7e6; border: 1px solid #ffe9a8; border-radius: 4px; font-size: 12px; color: #ad8b00; }
.empty-cell { text-align: center; color: #999; padding: 40px 0; }
.pagination { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #667; button { padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; &:disabled { opacity: .5; } } }
.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #eee; }
.btn { padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer; &.primary { background: #1890ff; border-color: #1890ff; color: #fff; } &:disabled { opacity: .6; cursor: not-allowed; } }
</style>
