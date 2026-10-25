<template>
  <!-- FP-15 批量换库抽屉（截图27）：新建题库按钮 + 分类筛选 + 名称搜索 +
       题库单选列表 + 已选题库回显；确定后把勾选的试题整体迁移。 -->
    <el-drawer
    :model-value="true"
    size="560px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>批量换库</span>
        <span class="close-btn" role="button" tabindex="0" aria-label="关闭" @click="emit('close')" @keydown.enter.prevent="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="toolbar">
          <el-button class="btn primary" @click="showCreateLib = true">新建题库</el-button>
          <el-select v-model="catalogId" class="filter-select" @change="reload(1)">
            <el-option value="" label="全部分类" />
            <el-option v-for="item in flatCatalogs" :key="item.id" :value="item.id" :label="item.name" />
          </el-select>
          <el-input v-model.trim="keyword" placeholder="请输入题库名称搜索" @keyup.enter="reload(1)" />
          <el-button class="btn" @click="reload(1)">搜索</el-button>
        </div>

        <div class="lib-list">
          <div v-for="lib in libs" :key="lib.id" class="lib-row"
               :class="{ active: pickedId === lib.id }"
               role="button" tabindex="0"
               @click="pick(lib.id)" @keydown.enter.prevent="pick(lib.id)">
            <el-radio :model-value="pickedId === lib.id" />
            <span class="lib-name">{{ lib.name }}</span>
            <span class="lib-cat">{{ lib.catalogName }}</span>
          </div>
          <p v-if="!loading && !libs.length" class="empty">没有找到题库</p>
        </div>

        <p class="picked-tip">
          已选题库：<b>{{ pickedLib?.name || '未选择' }}</b>
          <span class="count">（{{ count }} 道试题将整体迁移过去）</span>
        </p>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!pickedId || saving" @click="confirm">
          {{ saving ? '迁移中…' : '确定' }}
        </el-button>
      </div>
    </div>

    <!-- 复用建库抽屉；建完自动落到新库并刷新列表 -->
    <LibFormDrawer
      v-if="showCreateLib"
      mode="create"
      @close="showCreateLib = false"
      @saved="onLibCreated"
    />
    </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  batchQues, getCatalogTree, getLibList,
  type CatalogTreeNode, type LibItem
} from '@/api/exam'
import LibFormDrawer from './LibFormDrawer.vue'

const props = defineProps<{ quesIds: string[]; count?: number }>()
const emit = defineEmits<{ close: []; saved: [] }>()

interface FlatCatalog { id: string; name: string }

const libs = ref<LibItem[]>([])
const flatCatalogs = ref<FlatCatalog[]>([])
const catalogId = ref('')
const keyword = ref('')
const pickedId = ref('')
const loading = ref(false)
const saving = ref(false)
const showCreateLib = ref(false)

const count = computed(() => props.count ?? props.quesIds.length)
const pickedLib = computed(() => libs.value.find(lib => lib.id === pickedId.value) || null)

const reload = async (next?: number) => {
  loading.value = true
  try {
    const res = await getLibList(next ?? 1, 50, 'updateTime', 'desc', {
      queryType: 0,
      keyword: keyword.value,
      catalogId: catalogId.value,
      routingPath: '',
      creatorUserId: '',
      disabled: -1
    })
    libs.value = res.records || []
    // 目标库里不该出现"当前所在库"，但列表页不传来源库，这里不做排除
  } finally {
    loading.value = false
  }
}

const pick = (id: string) => { pickedId.value = id }

const loadCatalogs = async () => {
  try {
    const tree = await getCatalogTree() as unknown as CatalogTreeNode
    const out: FlatCatalog[] = []
    const walk = (node: CatalogTreeNode, depth: number) => {
      if (node?.id && node.id !== 'root') {
        out.push({ id: node.id, name: `${'　'.repeat(depth)}${node.name}` })
      }
      for (const child of node?.children || []) {
        walk(child, depth + 1)
      }
    }
    walk(tree, 0)
    flatCatalogs.value = out
  } catch { /* 拦截器已提示 */ }
}

const onLibCreated = async () => {
  showCreateLib.value = false
  await reload(1)
  // 新建的库一般排在列表最前（按更新时间倒序），自动选中它少一步操作
  if (libs.value[0]) {
    pickedId.value = libs.value[0].id
  }
}

const confirm = async () => {
  if (!pickedId.value) return
  saving.value = true
  try {
    await batchQues('changeLib', props.quesIds, { libId: pickedId.value })
    toast.success(`已将 ${count.value} 道试题迁移到「${pickedLib.value?.name}」`)
    emit('saved')
    emit('close')
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}

onMounted(() => {
  reload(1)
  loadCatalogs()
})
</script>

<style scoped lang="scss">
.drawer { width: 560px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; border-radius: 4px; } }
}

.drawer-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 16px 20px; }

.toolbar {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;

  .filter-select { font-size: 12px; max-width: 150px; }
  .el-input { flex: 1; min-width: 140px; font-size: 12px; }
}

.lib-list {
  flex: 1; min-height: 0; overflow-y: auto;
  border: 1px solid #e6eaf1; border-radius: 6px;
}

.lib-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; font-size: 13px; color: #4a5368;
  border-bottom: 1px solid #f2f4f8; cursor: pointer;

  &:hover { background: #f7f9fd; }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
  &.active { background: #eaf2ff; color: #1890ff; }
  .lib-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lib-cat { font-size: 12px; color: #a0a7b8; }
}

.empty { text-align: center; color: #b0b7c3; font-size: 13px; padding: 40px 0; margin: 0; }

.picked-tip {
  margin: 0; font-size: 12px; color: #8a92a5;

  b { color: #1f2937; }
  .count { color: #a0a7b8; }
}

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #eee; }

.btn {
  padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>