<template>
  <!-- F12 签名记录抽屉 -->
    <el-drawer
    :model-value="true"
    size="640px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>签名记录</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="filter-row">
          <el-input v-model.trim="keyword" placeholder="姓名/账号搜索" @keyup.enter="reload(1)" />
          <el-button class="btn primary" @click="reload(1)">查询</el-button>
          <el-button class="btn" @click="doExport">导出</el-button>
        </div>

        <div class="table-wrap">
          <el-table :data="list" row-key="id" empty-text="暂无签名记录">
            <el-table-column label="账号" min-width="130"><template #default="{ row }">{{ row.account || '--' }}</template></el-table-column>
            <el-table-column label="姓名" min-width="110"><template #default="{ row }">{{ row.fullname || '--' }}</template></el-table-column>
            <el-table-column label="签名" width="160">
              <template #default="{ row }">
                  <img v-if="row.signatureUrl" :src="row.signatureUrl" alt="签名" class="sign-img" loading="lazy" />
                  <span v-else class="muted">--</span>
              </template>
            </el-table-column>
            <el-table-column label="签名时间" width="170"><template #default="{ row }">{{ row.signedAt || '--' }}</template></el-table-column>
          </el-table>
        </div>

        <div class="pagination">
          <span>共 {{ total }} 条</span>
          <el-pagination v-model:current-page="pageNo" :page-size="pageSize" :total="total" layout="prev, pager, next" background @current-change="reload" />
        </div>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { exportArrangeSignatures, getArrangeSignatures, type ArrangeSignatureItem } from '@/api/arrange'

const props = defineProps<{ arrangeId: string }>()
const emit = defineEmits<{ close: [] }>()

const list = ref<ArrangeSignatureItem[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 10
const keyword = ref('')

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  try {
    const res = await getArrangeSignatures(props.arrangeId, pageNo.value, pageSize, keyword.value)
    list.value = res.records || []
    total.value = res.total || 0
  } catch { /* 拦截器已提示 */ }
}

onMounted(() => reload(1))

const doExport = async () => {
  try {
    await exportArrangeSignatures(props.arrangeId)
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}
</script>

<style scoped lang="scss">
.drawer { width: 640px; height: 100%; background: #fff; display: flex; flex-direction: column; }
.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; } }
}
.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 20px; gap: 12px; }
.filter-row { display: flex; gap: 10px; input { flex: 1; border: 1px solid #d9d9d9; border-radius: 4px; padding: 7px 10px; font-size: 13px; outline: none; } }
.table-wrap { flex: 1; min-height: 0; overflow: auto; border: 1px solid #eef1f6; border-radius: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #f2f4f8; }
th { background: #fafbfd; color: #667; font-weight: 500; }
.col-sign { width: 160px; } .col-time { width: 170px; }
.sign-img { max-width: 140px; max-height: 48px; }
.muted { color: #b0b7c3; }
.empty-cell { text-align: center; color: #999; padding: 40px 0; }
.pagination { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #667; button { padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; &:disabled { opacity: .5; } } }
.btn {
  padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
}
</style>
