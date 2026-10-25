<template>
  <!-- FP-08 试题编辑/新建页（截图10/16~21）：上半固定表单 + 下半按题型动态表单。
       type=5 组合题时，下半换成"子题列表"，每条子题复用同一个 QuesBodyForm。 -->
  <div class="ques-form">
    <header class="form-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1>{{ isEdit ? '编辑试题' : '新建试题' }}</h1>
      <div class="header-actions">
        <el-button class="btn" @click="goBack">返回</el-button>
        <el-button v-if="!isEdit" class="btn" :disabled="saving" @click="save(true)">保存并新增</el-button>
        <el-button class="btn primary" :disabled="saving" @click="save(false)">
          {{ saving ? '保存中…' : '保存' }}
        </el-button>
      </div>
    </header>

    <!-- 上半表单 -->
    <section class="card">
      <div class="grid">
        <label class="field">
          <span>题库</span>
          <el-input :model-value="libName" disabled />
        </label>
        <label class="field">
          <span>难度级别</span>
          <el-select v-model="form.levelType">
            <el-option :value="0" label="易" />
            <el-option :value="1" label="中" />
            <el-option :value="2" label="难" />
          </el-select>
        </label>
        <div class="field">
          <span>考核点</span>
          <!-- 对齐原平台：点击弹出可滚动列表 + 底部编辑；编辑打开考核点抽屉 -->
          <PointPicker v-model="form.pointIds" :lib-id="libId" />
        </div>
        <label class="field">
          <span>题型</span>
          <el-select v-model="form.type" :disabled="isEdit">
            <el-option v-for="(label, value) in TYPE_LABELS" :key="value" :value="Number(value)" :label="label" />
          </el-select>
        </label>
      </div>
    </section>

    <!-- 主试题正文 -->
    <section class="card">
      <QuesBodyForm :type="form.type" :body="form.body" />

      <!-- 组合题：子题列表 -->
      <template v-if="form.type === 5">
        <div class="sub-header">
          <span class="sub-title">子题（{{ subQuestions.length }}）</span>
          <el-button class="btn" @click="addSub">+ 新增子题</el-button>
        </div>

        <div v-for="(sub, index) in subQuestions" :key="index" class="sub-card">
          <div class="sub-top">
            <span class="sub-index">子题 {{ index + 1 }}</span>
            <el-select v-model="sub.type" class="sub-type">
              <el-option v-for="(label, value) in SUB_TYPE_LABELS" :key="value" :value="Number(value)" :label="label" />
            </el-select>
            <el-button class="icon-btn danger" aria-label="移除子题" @click="subQuestions.splice(index, 1)">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <QuesBodyForm :type="sub.type" :body="sub.body" />
        </div>

        <p v-if="!subQuestions.length" class="pending">
          还没有子题。点「+ 新增子题」逐条添加；子题支持单选/多选/判断/填空/问答，不支持再嵌套组合题。
        </p>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import {
  createQues, getLibDetail, getPointList, getQuesDetail, updateQues,
  type QuesBodyDraft, type PointItem, type QuesSaveReq, type QuesSubReq
} from '@/api/exam'
import QuesBodyForm from './components/QuesBodyForm.vue'
import PointPicker from './components/PointPicker.vue'
import { Close } from '@element-plus/icons-vue'

/** FP-08 试题编辑/新建页。新建态可选题型，编辑态题型只读（与截图10 一致）。 */
const route = useRoute()
const router = useRouter()

const TYPE_LABELS: Record<number, string> = {
  0: '单选', 1: '多选', 2: '判断', 3: '填空', 4: '问答', 5: '组合'
}
/** 子题不允许再嵌套组合题（后端也只挂一层）。 */
const SUB_TYPE_LABELS: Record<number, string> = {
  0: '单选', 1: '多选', 2: '判断', 3: '填空', 4: '问答'
}

const editId = String(route.query.id ?? '')
const isEdit = computed(() => Boolean(editId))

const libId = ref(String(route.query.libId ?? ''))
const libName = ref('')
const saving = ref(false)
const points = ref<PointItem[]>([])
const subQuestions = ref<{ type: number; body: QuesBodyDraft }[]>([])

const emptyBody = (withOptions = true): QuesBodyDraft => ({
  content: '',
  options: withOptions
    ? [1, 2, 3, 4].map(i => ({ itemContent: '', answer: 0, orderIndex: i }))
    : [],
  judgeCorrect: '',
  judgeWrong: '',
  judgeAnswer: 0,
  answerContent: '',
  keywords: [],
  explainText: ''
})

const form = reactive({
  type: 0,
  levelType: 1,
  pointIds: [] as string[],
  body: emptyBody()
})

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim()


const togglePoint = (id: string) => {
  form.pointIds = form.pointIds.filter(pid => pid !== id)
}

const addSub = () => subQuestions.value.push({ type: 0, body: emptyBody() })

/** body → 请求体里"与题型相关"的那部分字段（主子题共用）。 */
const bodyFields = (body: QuesBodyDraft, type: number): Partial<QuesSubReq> => {
  if (type === 0 || type === 1) {
    return {
      questionItems: body.options
        .filter(o => o.itemContent.trim())
        .map((o, index) => ({ itemContent: o.itemContent, answer: o.answer, orderIndex: index + 1 }))
    }
  }
  if (type === 2) {
    return {
      judgeCorrectOptionContent: body.judgeCorrect,
      judgeWrongOptionContent: body.judgeWrong,
      judgeAnswer: body.judgeAnswer
    }
  }
  if (type === 3 || type === 4) {
    return {
      answerContent: body.answerContent,
      answerKeywords: body.keywords.filter(k => k.keyword.trim())
        .map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio }))
    }
  }
  return {}
}

const load = async () => {
  if (isEdit.value) {
    const detail = await getQuesDetail(editId)
    libId.value = detail.libId
    libName.value = detail.libName
    form.type = detail.type
    form.levelType = detail.levelType ?? 1
    form.body.content = detail.content || detail.summary || ''
    form.body.explainText = detail.explainText || ''
    form.body.options = (detail.questionItems || []).map((item, index) => ({
      itemContent: item.itemContent,
      answer: item.answer,
      orderIndex: item.orderIndex ?? index + 1
    }))
    form.body.judgeCorrect = detail.judgeCorrectOptionContent || ''
    form.body.judgeWrong = detail.judgeWrongOptionContent || ''
    form.body.judgeAnswer = detail.judgeAnswer ?? 0
    form.body.answerContent = detail.answerContent || ''
    form.body.keywords = (detail.answerKeywords || []).map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio }))
    form.pointIds = (detail.points || []).map(p => p.pointId)
    subQuestions.value = (detail.subQuestions || []).map(sub => ({
      type: sub.type,
      body: {
        content: sub.content || sub.summary || '',
        options: (sub.questionItems || []).map((item, index) => ({
          itemContent: item.itemContent,
          answer: item.answer,
          orderIndex: item.orderIndex ?? index + 1
        })),
        judgeCorrect: sub.judgeCorrectOptionContent || '',
        judgeWrong: sub.judgeWrongOptionContent || '',
        judgeAnswer: sub.judgeAnswer ?? 0,
        answerContent: sub.answerContent || '',
        keywords: (sub.answerKeywords || []).map(k => ({ keyword: k.keyword, scoreRatio: k.scoreRatio })),
        explainText: sub.explainText || ''
      }
    }))
  } else {
    const lib = await getLibDetail(libId.value)
    libName.value = lib.name
  }
  try {
    points.value = await getPointList(libId.value)
    if (!isEdit.value && points.value[0] && !form.pointIds.length) {
      // 新建默认挂默认考点，避免出现"没有考核点"的试题
      form.pointIds = [points.value[0].id]
    }
  } catch { /* 拦截器已提示 */ }
}

const buildReq = (): QuesSaveReq => {
  const type = form.type
  const body = form.body
  const req: QuesSaveReq = {
    libId: libId.value,
    type,
    levelType: form.levelType,
    content: body.content,
    summary: stripHtml(body.content),
    explainText: body.explainText,
    noOrderMark: type === 1 ? 1 : 0,
    points: form.pointIds.map((pid, index) => ({ pointId: pid, orderIndex: index + 1 })),
    ...bodyFields(body, type)
  }
  if (type === 5) {
    req.subQuestions = subQuestions.value.map(sub => ({
      type: sub.type,
      levelType: form.levelType,
      content: sub.body.content,
      summary: stripHtml(sub.body.content),
      explainText: sub.body.explainText,
      noOrderMark: sub.type === 1 ? 1 : 0,
      ...bodyFields(sub.body, sub.type)
    }))
  }
  return req
}

const validate = () => {
  if (!form.body.content.trim()) {
    toast.warn('题干不能为空')
    return false
  }
  if ((form.type === 0 || form.type === 1) && form.body.options.filter(o => o.itemContent.trim()).length < 2) {
    toast.warn('选项至少2项')
    return false
  }
  if (form.type === 5) {
    if (!subQuestions.value.length) {
      toast.warn('组合题至少需要 1 道子题')
      return false
    }
    for (let i = 0; i < subQuestions.value.length; i++) {
      const sub = subQuestions.value[i]
      if (!sub) continue
      if (!sub.body.content.trim()) {
        toast.warn(`子题 ${i + 1} 的题干不能为空`)
        return false
      }
      if ((sub.type === 0 || sub.type === 1) && sub.body.options.filter(o => o.itemContent.trim()).length < 2) {
        toast.warn(`子题 ${i + 1} 的选项至少2项`)
        return false
      }
    }
  }
  return true
}

const resetBody = () => {
  form.body.content = ''
  form.body.explainText = ''
  form.body.options = emptyBody().options
  form.body.judgeCorrect = ''
  form.body.judgeWrong = ''
  form.body.answerContent = ''
  form.body.keywords = []
  subQuestions.value = []
}

const save = async (andNew: boolean) => {
  if (!validate()) return
  saving.value = true
  try {
    if (isEdit.value) {
      await updateQues(editId, buildReq())
      toast.success('试题已保存')
      goBack()
    } else {
      await createQues(buildReq())
      toast.success('试题已创建')
      if (andNew) {
        resetBody()
      } else {
        goBack()
      }
    }
  } catch {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  if (libId.value) {
    router.push(`/exam/queslib/detail?libId=${libId.value}`)
  } else {
    router.push('/exam/queslib')
  }
}

onMounted(() => { load() })
</script>

<style scoped lang="scss">
// 考试域布局的 .exam-content 是 overflow:hidden（页面自管滚动，与 table-wrap 模式一致），
// 本页是长表单，必须自己充当滚动容器，否则超出部分被裁掉、页面无法滚动
.ques-form { padding: 16px 20px 32px; display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0; overflow-y: auto; }

.form-header {
  display: flex;
  align-items: center;
  gap: 10px;

  .back-btn {
    width: 28px; height: 28px;
    border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
    font-size: 18px; line-height: 1; color: #4a5368; cursor: pointer;
    &:hover { border-color: #1890ff; color: #1890ff; }
  }

  h1 { flex: 1; margin: 0; font-size: 17px; font-weight: 600; color: #1f2937; }
  .header-actions { display: flex; gap: 8px; }
}

.card {
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  background: #fff;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px 20px;
}

.field {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;

  > span { flex: 0 0 64px; color: #8a92a5; padding-top: 7px; }

  input, select {
    flex: 1;
    min-width: 0;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 13px;
    outline: none;
    &:focus { border-color: #1890ff; }
    &:disabled { background: #f5f7fa; color: #8a92a5; }
  }
}

/* 考核点交给 PointPicker 自带样式 */

.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #f2f4f8;

  .sub-title { font-size: 13px; font-weight: 600; color: #4a5368; }
}

.sub-card {
  border: 1px solid #e6eaf1;
  border-radius: 6px;
  padding: 12px 14px;
  background: #fcfdff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-top {
  display: flex;
  align-items: center;
  gap: 10px;

  .sub-index { font-size: 12px; font-weight: 600; color: #2f54eb; }
  .sub-type {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    outline: none;
  }
  .icon-btn { margin-left: auto; }
}

.pending {
  margin: 0; padding: 12px 14px;
  background: #fafbfd; border: 1px dashed #dfe4ec; border-radius: 6px;
  font-size: 12px; color: #8a92a5; line-height: 1.8;
}

// 幽灵图标按钮：常态无边框融入行内，悬停才浮现底色（与 QuesBodyForm 口径一致）
.icon-btn {
  width: 26px; height: 26px; padding: 0;
  border: none; border-radius: 4px; background: transparent;
  cursor: pointer; color: #8a92a5;
  .el-icon { font-size: 15px; }
  &:hover:not(:disabled) { color: #1890ff; background: #f0f7ff; }
  &:disabled { color: #d5dae3; cursor: not-allowed; }
  &.danger {
    color: #b0b7c3;
    &:hover:not(:disabled) { color: #f5222d; background: #fff1f0; }
  }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 1px; }
}

.btn {
  padding: 7px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4a5368;
  cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
