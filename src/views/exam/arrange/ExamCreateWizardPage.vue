<template>
  <!-- F15/F16/F17/F18 创建考试向导：① 创建试卷 ② 编辑试题 ③ 发布考试 -->
  <div class="wizard-page">
    <header class="wizard-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1>创建考试</h1>
      <span class="type-tag">{{ typeLabel }}</span>
      <span v-if="published" class="status-tag">已发布 · 前两步只读</span>
      <ExamWizardSteps class="wizard-steps" :current="step" :can-jump="canJump" @jump="jump" />
      <div class="header-actions">
        <el-button class="btn" :disabled="step <= 1" @click="prevStep">上一步</el-button>
        <el-button class="btn primary" :disabled="busy" @click="nextStep">{{ nextLabel }}</el-button>
      </div>
    </header>

    <div class="wizard-body">
      <!-- ① 创建试卷 -->
      <section v-if="step === 1" class="panel">
        <template v-if="readonly">
          <p class="readonly-banner">考试已发布，本步骤仅供回看，不能修改。</p>
          <!-- 已发布回看：与原平台一致，保留三种创建方式的 tab，但表单整体置灰只读 -->
          <div class="way-tabs readonly-tabs" role="tablist">
            <el-button v-for="w in WAYS" :key="w.key" class="way-tab"
                    :class="{ active: w.key === 'new' }" disabled>
              <span class="way-icon" :class="w.key">{{ w.icon }}</span>
              <span>{{ w.label }}</span>
            </el-button>
          </div>
          <p class="cycle-note">
            注：若开启循环考试，当选择“固定出卷”“导入试卷”时，循环考试每次试卷相同；当选择“随机出卷”时，循环考试每次试卷随机。
          </p>
          <div class="paper-form readonly-form">
            <label class="form-row">
              <span class="row-label required">试卷名称</span>
              <span class="input-wrap">
                <el-input :model-value="paper?.name || ''" disabled />
              </span>
            </label>
            <label class="form-row">
              <span class="row-label required">试卷分类</span>
              <el-select disabled>
                <el-option :value="paper?.catalogId || 'root'" :label="paper?.catalogName || '默认试卷分类'" />
              </el-select>
            </label>
            <div class="form-row">
              <span class="row-label">出卷方式</span>
              <span class="pill-group">
                <el-button class="pill" :class="{ active: paperBuildType === 0 }" disabled>固定出卷</el-button>
                <el-button class="pill" :class="{ active: paperBuildType === 1 }" disabled>随机出卷</el-button>
              </span>
            </div>
            <div class="form-row">
              <span class="row-label">试卷保密</span>
              <span class="radio-inline">
                <label><el-radio :model-value="paper?.secrecy !== 1" disabled /> 公开</label>
                <label><el-radio :model-value="paper?.secrecy === 1" disabled /> 保密</label>
                <em>（仅支持创建者及超级管理员可编辑）</em>
              </span>
            </div>
          </div>
        </template>
        <template v-else>
          <p v-if="paperId" class="current-paper">
            当前试卷：<b>{{ paper?.name || paperId }}</b>
            <span>{{ paper?.status === 4 ? '已发布' : '未发布' }}</span>
          </p>

          <!-- 三种创建方式：点 tab 只显示对应内容（截图20） -->
          <div class="way-tabs" role="tablist">
            <el-button v-for="w in WAYS" :key="w.key" class="way-tab" role="tab"
                    :class="{ active: way === w.key }" :aria-selected="way === w.key"
                    @click="way = w.key">
              <span class="way-icon" :class="w.key">{{ w.icon }}</span>
              <span>{{ w.label }}</span>
            </el-button>
          </div>

          <p class="cycle-note">
            注：若开启循环考试，当选择“固定出卷”“导入试卷”时，循环考试每次试卷相同；当选择“随机出卷”时，循环考试每次试卷随机。
          </p>

          <!-- 创建新试卷 -->
          <div v-if="way === 'new'" class="paper-form">
            <label class="form-row">
              <span class="row-label required">试卷名称</span>
              <span class="input-wrap">
                <el-input v-model.trim="newPaper.name" maxlength="200" placeholder="请输入试卷名称" />
                <em>{{ newPaper.name.length }}/200</em>
              </span>
            </label>
            <label class="form-row">
              <span class="row-label required">试卷分类</span>
              <el-select v-model="newPaper.catalogId">
                <el-option value="root" label="默认试卷分类" />
              </el-select>
            </label>
            <div class="form-row">
              <span class="row-label">出卷方式</span>
              <span class="pill-group">
                <el-button class="pill" :class="{ active: newPaper.buildType === 0 }"
                        @click="newPaper.buildType = 0">固定出卷</el-button>
                <el-button class="pill" :class="{ active: newPaper.buildType === 1 }"
                        @click="newPaper.buildType = 1">随机出卷</el-button>
              </span>
            </div>
            <div class="form-row">
              <span class="row-label">试卷保密</span>
              <span class="radio-inline">
                <label><el-radio v-model.number="newPaper.secrecy" :value="0" /> 公开</label>
                <label><el-radio v-model.number="newPaper.secrecy" :value="1" /> 保密</label>
                <em>（仅支持创建者及超级管理员可编辑）</em>
              </span>
            </div>
          </div>

          <!-- 选择试卷 -->
          <div v-else-if="way === 'pick'" class="way-panel">
            <p class="way-desc">复用「试卷管理」里已建好的试卷，不会复制题目。</p>
            <el-button class="btn primary" :disabled="busy" @click="showPick = true">选择试卷</el-button>
          </div>

          <!-- 导入试卷 -->
          <div v-else class="way-panel">
            <p class="way-desc">下载 Excel 模板填好题目后导入，一份表生成一整张固定卷。</p>
            <el-button class="btn primary" :disabled="busy" @click="showImport = true">导入试卷</el-button>
          </div>
        </template>
      </section>

      <!-- ② 编辑试题 -->
      <section v-else-if="step === 2" class="panel">
        <!-- 已发布：只读回看试题列表（对齐原平台截图） -->
        <template v-if="readonly">
          <div class="ro-paper-head">
            <span class="ro-paper-name">{{ paper?.name || paperId }}</span>
            <span class="ro-tag">{{ paperBuildType === 1 ? '随机出卷' : '固定出卷' }}</span>
            <span v-if="paper?.secrecy === 1" class="ro-tag warn">保密</span>
          </div>

          <div class="ro-filter">
            <el-select v-model="roQuery.type" class="ro-select" @change="loadRoQuestions(1)">
              <el-option :value="-1" label="题型" />
              <el-option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)" :label="label" />
            </el-select>
            <el-select v-model="roQuery.levelType" class="ro-select" @change="loadRoQuestions(1)">
              <el-option :value="-1" label="难度" />
              <el-option v-for="(label, value) in LEVEL_LABELS" :key="value" :value="Number(value)" :label="label" />
            </el-select>
            <el-input v-model.trim="roQuery.keyword" class="ro-search" placeholder="请输入试题名称搜索"
                   @keyup.enter="loadRoQuestions(1)" />
            <el-button class="btn" @click="loadRoQuestions(1)">搜索</el-button>
            <el-button class="btn export-btn" :disabled="roLoading || roExporting" @click="exportRoQuestions">
              导出数据
            </el-button>
          </div>

          <div class="ro-table-wrap">
            <el-table v-loading="roLoading" :data="roQues" row-key="quesId" class="ro-table" empty-text="暂无试题">
              <el-table-column prop="summary" label="试题名称" min-width="260" show-overflow-tooltip />
              <el-table-column label="题型" width="100"><template #default="{ row }">{{ TYPE_LABELS[row.type] || '--' }}</template></el-table-column>
              <el-table-column label="考核点" width="140" show-overflow-tooltip><template #default="{ row }">{{ row.mainPointName || '--' }}</template></el-table-column>
              <el-table-column label="所属题库" min-width="160" show-overflow-tooltip><template #default="{ row }">{{ row.libName || '--' }}</template></el-table-column>
              <el-table-column label="难度" width="90"><template #default="{ row }">{{ LEVEL_LABELS[row.levelType] || '--' }}</template></el-table-column>
            </el-table>
          </div>

          <div class="ro-pagination">
            <span>共 {{ roTotal }} 条</span>
            <el-pagination v-model:current-page="roPage" :page-size="10" :total="roTotal" layout="prev, pager, next" background @current-change="loadRoQuestions" />
          </div>
        </template>

        <template v-else>
          <div class="paper-info">
            <p class="info-line"><span>使用试卷</span><b>{{ paper?.name || paperId }}</b></p>
            <p class="info-line"><span>出卷方式</span><b>{{ paperBuildType === 1 ? '随机出卷' : '固定出卷' }}</b></p>
            <p class="info-line"><span>试卷状态</span>
              <b :class="{ warn: paper?.status !== 4 }">{{ paper?.status === 4 ? '已发布' : '未发布（发布考试时会校验）' }}</b>
            </p>
          </div>
          <p class="panel-tip">题目编辑复用试卷管理模块的编辑器；改完点右上角「下一步」回到发布配置。</p>
          <div class="panel-actions">
            <el-button class="btn primary" @click="goEditPaper">去编辑试题</el-button>
            <el-button class="btn" @click="step = 3">直接进入发布配置</el-button>
          </div>
        </template>
      </section>

      <!-- ③ 发布考试 -->
      <section v-else class="panel">
        <PublishFormPanel ref="publishRef" :arrange-id="arrangeId!" :paper-id="paperId" :paper-build-type="paperBuildType"
                          :default-catalog-id="defaultCatalogId" @saved="onPublishSaved" @published="onPublished"
                          @paper-changed="onPublishPaperChanged" />
      </section>
    </div>

    <!-- F18.1 上一步 / 下一步：已发布时用来回看前两步（只读） -->

    <PaperPickDrawer v-if="showPick" @close="showPick = false" @picked="onPaperPicked" />
    <QuickCreateDrawer v-if="showImport" :default-catalog-id="'root'"
                       @close="showImport = false" @imported="onPaperImported" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import {
  createPaper, exportPaperQuestions, getPaperDetail, getPaperQuesList,
  type PaperItem, type PaperQuesItem
} from '@/api/paper'
import { createArrange, getArrangeDetail } from '@/api/arrange'
import PublishFormPanel from './components/PublishFormPanel.vue'
import PaperPickDrawer from './components/PaperPickDrawer.vue'
import QuickCreateDrawer from '../paper/components/QuickCreateDrawer.vue'
import ExamWizardSteps from '../components/ExamWizardSteps.vue'

const route = useRoute()
const router = useRouter()

const typeLabel = computed(() => (String(route.query.examType ?? '') === 'onlineExam' ? '线上考试' : '线上考试'))
const defaultCatalogId = ref(String(route.query.catalogId ?? 'root'))

/** 第一步的三种创建方式（截图20：三个 tab，只显示选中方式的内容）。 */
const WAYS = [
  { key: 'new' as const, label: '创建新试卷', icon: '＋' },
  { key: 'pick' as const, label: '选择试卷', icon: '▤' },
  { key: 'import' as const, label: '导入试卷', icon: '⇪' }
]

const step = ref(1)
const way = ref<'new' | 'pick' | 'import'>('new')
const busy = ref(false)
/** F18.1：考试已发布（status>0）时，前两步只读。 */
const published = ref(false)
const readonly = computed(() => published.value)
const arrangeId = ref<string>(String(route.query.arrangeId ?? ''))
const paperId = ref<string>(String(route.query.paperId ?? ''))
const paper = ref<PaperItem | null>(null)
const showPick = ref(false)
const showImport = ref(false)
const publishRef = ref<InstanceType<typeof PublishFormPanel> | null>(null)

const newPaper = ref({ name: '', catalogId: 'root', buildType: 0, secrecy: 0 })

/** 只读回看「编辑试题」时的列表筛选与分页。 */
const TYPE_LABELS: Record<number, string> = {
  0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题', 5: '组合题'
}
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }
const roQuery = reactive({ type: -1, levelType: -1, keyword: '' })
const roQues = ref<PaperQuesItem[]>([])
const roTotal = ref(0)
const roPage = ref(1)
const roLoading = ref(false)
const roExporting = ref(false)

const paperBuildType = computed(() => paper.value?.buildType ?? 0)

const canJump = (no: number) => no <= step.value || !!paperId.value

const loadPaper = async () => {
  if (!paperId.value) return
  try {
    paper.value = await getPaperDetail(paperId.value)
  } catch { /* 拦截器已提示 */ }
}

/** 第一步共用的收尾：建/选好试卷后创建考试草稿，允许进入第二步。 */
const bindPaper = async (id: string, buildType: number, defaultName: string) => {
  paperId.value = id
  await loadPaper()
  if (!arrangeId.value) {
    try {
      const res = await createArrange({
        name: `${defaultName}考试`,
        catalogId: defaultCatalogId.value,
        paperId: id,
        paperBuildType: buildType,
        stepNumber: 2
      })
      arrangeId.value = res.id
    } catch {
      return
    }
  } else {
    try {
      await createArrangeTax(arrangeId.value, id, buildType)
    } catch { /* 拦截器已提示 */ }
  }
  step.value = 2
}

/** 已有草稿时把试卷换过去（走 update 的白名单/普通分支）。 */
const createArrangeTax = async (id: string, pid: string, buildType: number) => {
  const { updateArrange } = await import('@/api/arrange')
  await updateArrange(id, {
    name: `${paper.value?.name ?? '考试'}考试`,
    catalogId: defaultCatalogId.value,
    paperId: pid,
    paperBuildType: buildType,
    stepNumber: 2
  })
}

const createNewPaper = async () => {
  if (!newPaper.value.name.trim()) {
    toast.warn('请输入试卷名称')
    return
  }
  busy.value = true
  try {
    const res = await createPaper({
      name: newPaper.value.name.trim(),
      catalogId: newPaper.value.catalogId,
      buildType: newPaper.value.buildType,
      secrecy: newPaper.value.secrecy
    })
    await bindPaper(res.id, newPaper.value.buildType, newPaper.value.name.trim())
  } finally {
    busy.value = false
  }
}

const onPaperPicked = async (p: PaperItem) => {
  showPick.value = false
  busy.value = true
  try {
    await bindPaper(p.id, p.buildType, p.name)
  } finally {
    busy.value = false
  }
}

/** 导入成功后 QuickCreateDrawer 会带出新建的试卷 ID。 */
const onPaperImported = async (importedPaperId?: string) => {
  showImport.value = false
  if (!importedPaperId) {
    toast.warn('导入完成但没有拿到试卷 ID，请到「选择已有试卷」里挑一下')
    return
  }
  busy.value = true
  try {
    await bindPaper(importedPaperId, 0, '导入试卷')
  } finally {
    busy.value = false
  }
}

const goEditPaper = () => {
  if (!paperId.value) {
    toast.warn('请先选择试卷')
    return
  }
  const path = paperBuildType.value === 1 ? '/exam/paper/auto' : '/exam/paper/quick'
  router.push(`${path}?paperId=${paperId.value}&arrangeId=${arrangeId.value}`)
}

const jump = (no: number) => {
  if (no === 1) {
    step.value = 1
    return
  }
  if (!paperId.value) {
    toast.warn('请先完成第一步：选择或创建试卷')
    return
  }
  step.value = no
}

const onPublishSaved = (id: string) => {
  arrangeId.value = id
}

const onPublished = () => {
  published.value = true
}

/** 发布页更换「使用试卷」后同步向导，保证第一步/上一步回看的是新卷。 */
const onPublishPaperChanged = (p: PaperItem) => {
  paperId.value = p.id
  paper.value = p
}

/** 只读回看：拉取试卷试题列表（10 条/页，与截图一致）。 */
const loadRoQuestions = async (page = roPage.value) => {
  if (!paperId.value) return
  roPage.value = page
  roLoading.value = true
  try {
    const res = await getPaperQuesList(paperId.value, page, 10, roQuery.type, roQuery.levelType, roQuery.keyword)
    roQues.value = res.records || []
    roTotal.value = res.total || 0
  } catch {
    roQues.value = []
    roTotal.value = 0
  } finally {
    roLoading.value = false
  }
}

/** 只读回看：导出当前筛选下的试卷试题列表。 */
const exportRoQuestions = async () => {
  if (!paperId.value || roExporting.value) return
  roExporting.value = true
  try {
    await exportPaperQuestions(paperId.value, {
      type: roQuery.type,
      levelType: roQuery.levelType,
      keyword: roQuery.keyword
    })
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  } finally {
    roExporting.value = false
  }
}

/** 进入第二步且为只读时自动加载列表。 */
watch(step, (v) => {
  if (v === 2 && readonly.value) void loadRoQuestions(1)
})

/** 右上角「下一步」：第一步按当前 tab 建/选/导入试卷，第二步进发布配置，第三步直接发布。 */
const nextStep = () => {
  if (busy.value) return
  if (step.value === 1) {
    // 已发布回看：第一步是只读的，直接前进；否则会误触发「新建试卷」的必填校验
    if (readonly.value) { step.value = 2; return }
    if (way.value === 'new') { createNewPaper(); return }
    if (way.value === 'pick') { showPick.value = true; return }
    showImport.value = true
    return
  }
  if (step.value === 2) { jump(3); return }
  void publishRef.value?.save(true)
}

const prevStep = () => {
  if (step.value > 1) step.value -= 1
}

const nextLabel = computed(() => {
  if (step.value < 3) return '下一步'
  return published.value ? '更新后发布' : '发布考试'
})

const goBack = () => router.push('/exam/exam-mgmt')

onMounted(async () => {
  if (arrangeId.value) {
    try {
      const d = await getArrangeDetail(arrangeId.value)
      published.value = d.status > 0
      if (!paperId.value) paperId.value = d.paperId
    } catch { /* 拦截器已提示 */ }
  }
  if (paperId.value) await loadPaper()
  const qs = Number(route.query.step ?? 0)
  if (qs >= 1 && qs <= 3) step.value = qs
  else step.value = paperId.value ? 2 : arrangeId.value ? 3 : 1
  // watch 不感知初始值，首屏就是第二步时要主动拉一次
  if (step.value === 2 && readonly.value) void loadRoQuestions(1)
})
</script>

<style scoped lang="scss">
.wizard-page { display: flex; flex-direction: column; height: 100%; min-height: 0; padding: 12px 16px 16px; }
.wizard-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px; min-height: 40px;
  .back-btn { width: 28px; height: 28px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; font-size: 18px; color: #4a5368; cursor: pointer; }
  h1 { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
  .type-tag { padding: 1px 8px; border-radius: 3px; font-size: 11px; color: #1890ff; background: #e8f1ff; border: 1px solid #bcd7ff; }
  .status-tag { padding: 1px 8px; border-radius: 3px; font-size: 11px; background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; }
  /* 步骤条居中，上一步/下一步靠右（截图25） */
  .wizard-steps { margin: 0 auto; }
  .header-actions { display: flex; gap: 10px; flex-shrink: 0; .btn { align-self: center; } }
}
.readonly-banner {
  margin: 0 0 12px; padding: 9px 14px; border-radius: 4px; font-size: 13px; line-height: 1.6;
  background: #fffbe6; border: 1px solid #ffe58f; color: #ad6800;
}
.wizard-body { flex: 1; min-height: 0; overflow-y: auto; }
.panel-tip { margin: 0 0 12px; font-size: 13px; color: #8a92a5; }

/* ---- 第一步：三种创建方式（截图20） ---- */
.way-tabs { display: flex; justify-content: center; gap: 16px; margin: 18px 0 14px; flex-wrap: wrap; }
.way-tab {
  display: inline-flex; align-items: center; gap: 8px;
  min-width: 132px; padding: 10px 16px;
  border: 1px solid #e5e8ef; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer;

  &:hover { border-color: #91caff; }
  &.active { border-color: #1890ff; color: #1890ff; background: #f5f9ff; }
}
.way-icon {
  display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center;
  border-radius: 4px; font-size: 13px;
  &.new { color: #1890ff; background: #e8f1ff; }
  &.pick { color: #fa8c16; background: #fff4e6; }
  &.import { color: #52c41a; background: #f0f9eb; }
}
.cycle-note {
  max-width: 720px; margin: 0 auto 22px; padding: 9px 14px; border-radius: 4px;
  background: #fafbfd; border: 1px solid #eef1f6; font-size: 12px; color: #8a92a5; line-height: 1.7;
}
.current-paper {
  max-width: 640px; margin: 0 auto 12px; padding: 8px 14px;
  border: 1px solid #eef1f6; border-radius: 4px; background: #fafbfd;
  font-size: 12px; color: #8a92a5;
  b { color: #303133; font-weight: 500; margin: 0 8px; }
  span { color: #52c41a; }
}
.paper-form { display: flex; flex-direction: column; gap: 16px; max-width: 640px; margin: 0 auto; }
.form-row {
  display: flex; align-items: center; gap: 12px; font-size: 13px; color: #4a5368;

  .row-label {
    width: 80px; flex-shrink: 0; text-align: right;
    &.required::after { content: ' *'; color: #f5222d; }
  }
  .input-wrap {
    position: relative; flex: 0 1 460px;
    input {
      width: 100%; box-sizing: border-box; padding: 7px 58px 7px 10px;
      border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; outline: none;
      &:focus { border-color: #1890ff; }
    }
    em {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      font-style: normal; font-size: 12px; color: #b0b7c3;
    }
  }
  select {
    flex: 0 1 460px; padding: 7px 10px; border: 1px solid #d9d9d9; border-radius: 4px;
    font-size: 13px; color: #4a5368; background: #fff; outline: none;
  }
}
.pill-group { display: inline-flex; gap: 10px; }
.pill {
  padding: 6px 18px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer;
  &.active { border-color: #1890ff; background: #e8f1ff; color: #1890ff; }
}
.radio-inline {
  display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 13px; color: #4a5368;
  label { display: inline-flex; align-items: center; gap: 5px; input { accent-color: #1890ff; } }
  em { font-style: normal; font-size: 12px; color: #8a92a5; }
}
.way-panel { max-width: 640px; margin: 0 auto; padding: 8px 0; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
.way-desc { margin: 0; font-size: 13px; color: #8a92a5; line-height: 1.8; }
.paper-info { border: 1px solid #e5e8ef; border-radius: 8px; padding: 14px 18px; background: #fafbfd; margin-bottom: 12px; }
.info-line { margin: 0 0 8px; font-size: 13px; color: #4a5368; span { color: #8a92a5; margin-right: 10px; } b { color: #1f2937; font-weight: 500; &.warn { color: #d46b08; } } }
.panel-actions { display: flex; gap: 10px; }
.btn {
  padding: 8px 18px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 13px; color: #4a5368; cursor: pointer; align-self: flex-start;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
/* ---- 已发布只读回看（对齐原平台编辑页） ---- */
.readonly-tabs .way-tab { cursor: default; }
.readonly-form {
  input, select { background: #f5f7fa; color: #8a92a5; cursor: not-allowed; }
  .pill {
    background: #f5f7fa; color: #8a92a5; border-color: #e5e8ef; cursor: not-allowed;
    &.active { background: #f0f5ff; color: #69a7f5; border-color: #c7ddff; }
  }
  .radio-inline { color: #8a92a5; em { color: #a0a7b8; } }
}
.ro-paper-head { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; }
.ro-paper-name { font-size: 15px; font-weight: 600; color: #1f2937; }
.ro-tag {
  padding: 0 8px; border-radius: 3px; font-size: 11px;
  color: #d46b08; background: #fff7e6; border: 1px solid #ffd591;
  &.warn { color: #cf1322; background: #fff1f0; border-color: #ffa39e; }
}
.ro-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.ro-select { border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; min-width: 96px; }
.ro-search {
  flex: 1; min-width: 180px; max-width: 360px;
  border: 1px solid #d9d9d9; border-radius: 4px; padding: 6px 10px; font-size: 12px; outline: none;
}
.ro-table-wrap { border: 1px solid #eef1f6; border-radius: 4px; overflow: auto; }
.ro-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f2f4f8; }
  th { background: #fafbfd; color: #667; font-weight: 500; white-space: nowrap; }
  .q-name { color: #1890ff; }
  .ellipsis { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-type { width: 90px; }
  .w-point { width: 190px; }
  .w-lib { width: 150px; }
  .w-level { width: 70px; }
}
.ro-pagination {
  display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 12px; color: #667;
  button {
    padding: 4px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer;
    &:disabled { opacity: .5; cursor: not-allowed; }
  }
}
.empty-cell { text-align: center; color: #999; padding: 32px 0; }
.table-loading { text-align: center; color: #999; font-size: 12px; padding: 12px 0; }
</style>
