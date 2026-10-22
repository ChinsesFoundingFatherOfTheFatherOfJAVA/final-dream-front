<template>
  <!-- FP-06 题库详情页骨架：页头 + 基本信息 + 双 tab（试题详情 / 正确率）。
       两个 tab 的内容属于 FP-07~FP-16，后端 /api/exam/ques、/point、/stat 尚未实现，
       这里如实标注"待实施"，避免点进来是一片空白让人以为页面坏了。 -->
  <div class="lib-detail">
    <header class="detail-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1 class="lib-name">
        {{ lib?.name || '题库详情' }}
        <span v-if="lib?.secrecy === 1" class="secrecy-tag">保密</span>
      </h1>
      <div class="header-actions">
        <el-button class="btn" @click="showShare = true">共享题库</el-button>
        <el-button class="btn" @click="showTransfer = true">转移题库</el-button>
      </div>
    </header>

    <section class="info-card">
      <div class="info-item"><span>题库名称</span><strong>{{ lib?.name || '--' }}</strong></div>
      <div class="info-item"><span>题库分类</span><strong>{{ lib?.catalogName || '--' }}</strong></div>
      <div class="info-item"><span>题库保密</span><strong>{{ lib?.secrecy === 1 ? '保密' : '公开' }}</strong></div>
      <div class="info-item"><span>考核点</span><strong>{{ lib?.pointQty ?? 0 }}</strong></div>
      <div class="info-item"><span>试题数</span><strong>{{ lib?.totalQuesQty ?? 0 }}</strong></div>
      <el-button class="link-btn" @click="showEdit = true">编辑基本信息</el-button>
    </section>

    <div class="tabs">
      <el-button
        v-for="item in tabs"
        :key="item.key"
       
        class="tab"
        :class="{ active: tab === item.key }"
        @click="tab = item.key"
      >{{ item.label }}</el-button>
    </div>

    <!-- 试题详情 tab：FP-07 真实列表（筛选/排序/分页/查看/删除） -->
    <QuesListTab
      v-if="tab === 'ques'"
      ref="quesListRef"
      :lib-id="libId"
      :ques-id="quesId"
      @edit="onEditQues"
      @create="onCreateQues"
      @ai-create="openAiDrawer('ai')"
      @quick-create="openAiDrawer('quick')"
      @import="openImportDrawer"
    />

    <!-- 正确率 tab：FP-16 尚未交付 -->
    <section v-else class="tab-panel">
      <p class="pending-title">该功能尚未交付</p>
      <p class="pending-desc">{{ pendingDesc }}</p>
    </section>

    <LibFormDrawer
      v-if="showEdit"
      mode="edit"
      :lib="lib"
      @close="showEdit = false"
      @saved="onSaved"
    />
    <ShareDrawer
      v-if="showShare"
      :lib="lib"
      @close="showShare = false"
      @saved="onSubDrawerSaved"
    />
    <TransferDrawer
      v-if="showTransfer && lib"
      :lib="lib"
      @close="showTransfer = false"
      @saved="onSubDrawerSaved"
    />
    <QuesImportDrawer
      v-if="showImportDrawer"
      :lib-id="libId"
      :format="importFormat"
      @close="showImportDrawer = false"
      @imported="onQuesSaved"
    />
    <AiQuesDrawer
      v-if="showAiDrawer"
      :lib-id="libId"
      :initial-mode="aiDrawerMode"
      @close="showAiDrawer = false"
      @saved="onQuesSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { getLibDetail, type LibDetail } from '@/api/exam'
import LibFormDrawer from './components/LibFormDrawer.vue'
import QuesListTab from './components/QuesListTab.vue'
import AiQuesDrawer from './components/AiQuesDrawer.vue'
import QuesImportDrawer from './components/QuesImportDrawer.vue'
import ShareDrawer from './components/ShareDrawer.vue'
import TransferDrawer from './components/TransferDrawer.vue'

const route = useRoute()
const router = useRouter()

const libId = String(route.query.libId ?? '')
/** 试卷管理页跳转过来时会带 quesId，只展示该题（题库 07 §9 增量）。 */
const quesId = String(route.query.quesId ?? '')
const lib = ref<LibDetail | null>(null)
const tab = ref<'ques' | 'rate'>('ques')
const showEdit = ref(false)
const showShare = ref(false)
const showTransfer = ref(false)
const showAiDrawer = ref(false)
/** 打开 AI/快速建题抽屉时带上前置模式（原平台是两个入口共用同一页面的双 tab）。 */
const aiDrawerMode = ref<'ai' | 'quick'>('ai')
/** FP-12 导入抽屉（Excel/Word 共用一个抽屉，用 format 区分）。 */
const showImportDrawer = ref(false)
const importFormat = ref<'excel' | 'word'>('excel')
/** 持有试题列表的引用：录入新题后要让列表自己重新拉一次，光刷题库信息不够。 */
const quesListRef = ref<{ reload: () => void } | null>(null)

const tabs = [
  { key: 'ques' as const, label: '试题详情' },
  { key: 'rate' as const, label: '正确率' }
]

/** 正确率 tab 属 FP-16，如实标注未交付（试题 tab 已接真实列表）。 */
const pendingDesc = computed(() =>
  '「正确率」属于 FP-16（按试题 / 按考核点统计 + 答题详情）。后端 /api/exam/stat 尚未实现，依赖考试模块上线后回填 exam_answer_stat。'
)

/** 编辑 / 新建试题 → FP-08 六题型编辑页（/exam/quesdetail）。 */
const onEditQues = (id: string) => {
  router.push(`/exam/quesdetail?id=${id}`)
}

const onCreateQues = () => {
  router.push(`/exam/quesdetail?libId=${libId}`)
}

const load = async () => {
  if (!libId) {
    toast.error('缺少题库 id，无法打开详情')
    return
  }
  try {
    lib.value = await getLibDetail(libId)
  } catch { /* 错误提示由 request.ts 拦截器统一处理 */ }
}

const goBack = () => {
  router.push('/exam/queslib')
}

const onSaved = () => {
  showEdit.value = false
  load()
}

const openImportDrawer = (format: 'excel' | 'word') => {
  importFormat.value = format
  showImportDrawer.value = true
}

const openAiDrawer = (mode: 'ai' | 'quick') => {
  aiDrawerMode.value = mode
  showAiDrawer.value = true
}

/** AI/快速建题录入成功后：既刷题库基本信息，也让试题列表重新拉一次。 */
const onQuesSaved = () => {
  load()
  quesListRef.value?.reload()
}

const onSubDrawerSaved = () => {
  showShare.value = false
  showTransfer.value = false
  load()
}

onMounted(load)
</script>

<style scoped lang="scss">
.lib-detail {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;

  .back-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    font-size: 18px;
    line-height: 1;
    color: #4a5368;
    cursor: pointer;

    &:hover { border-color: #1890ff; color: #1890ff; }
  }

  .lib-name {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .secrecy-tag {
    padding: 1px 6px;
    border-radius: 3px;
    background: #fff7e6;
    border: 1px solid #ffd591;
    color: #d46b08;
    font-size: 11px;
    font-weight: 400;
  }

  .header-actions { display: flex; gap: 8px; }
}

.info-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding: 14px 18px;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;

  .info-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;

    span { color: #8a92a5; }
    strong { color: #1f2937; font-weight: 500; }
  }

  .link-btn {
    margin-left: auto;
    border: none;
    background: transparent;
    color: #1890ff;
    font-size: 13px;
    cursor: pointer;

    &:hover { text-decoration: underline; }
  }
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e5e8ef;

  .tab {
    padding: 9px 18px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: #4a5368;
    font-size: 14px;
    cursor: pointer;

    &.active {
      color: #1890ff;
      border-bottom-color: #1890ff;
      font-weight: 600;
    }
  }
}

.tab-panel {
  padding: 48px 20px;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;
  text-align: center;

  .pending-title {
    margin: 0 0 8px;
    color: #8a92a5;
    font-size: 14px;
    font-weight: 600;
  }

  .pending-desc {
    margin: 0 auto;
    max-width: 640px;
    color: #a0a7b8;
    font-size: 12px;
    line-height: 1.8;
  }
}

.btn {
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;

  &:hover { border-color: #1890ff; color: #1890ff; }
}
</style>