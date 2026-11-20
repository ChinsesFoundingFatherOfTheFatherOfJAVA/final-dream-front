<template>
  <div class="theme-list-page">
    <!-- FP-03 标题区：左侧标题/副标题，右侧「查看产品介绍 / 从模板创建 / 创建新主题」 -->
    <div class="page-header">
      <div class="header-info">
        <h1 class="page-title">训练主题管理</h1>
        <p class="page-desc">管理所有训练主题</p>
      </div>
      <div class="header-actions">
        <button type="button" class="intro-toggle" @click="showIntro">查看产品介绍</button>
        <button type="button" class="btn-template" @click="goTemplate">从模板创建</button>
        <button type="button" class="btn-create" @click="goCreate">+ 创建新主题</button>
      </div>
    </div>

    <!-- FP-04 五个筛选条件（归属/来源为占位，前端不传值） -->
    <div class="filter-bar">
      <div
        v-for="f in SELECT_FILTERS"
        :key="f.key"
        class="yxt-select filter-item"
        :class="{ select: f.key === 'sourceType' }"
        role="combobox"
        tabindex="0"
        aria-haspopup="listbox"
        :aria-expanded="openFilter === f.key"
        :aria-label="f.label"
        @click="toggleFilter(f.key)"
        @keydown.enter.prevent="toggleFilter(f.key)"
        @keydown.space.prevent="toggleFilter(f.key)"
        @keydown.esc="openFilter = ''"
      >
        <input
          class="yxt-input__inner"
          :class="{ 'is-placeholder': !labelOf(f.options, filters[f.key]) }"
          :value="labelOf(f.options, filters[f.key])"
          readonly
          tabindex="-1"
        />
        <span class="yxt-input__suffix" aria-hidden="true"><i class="yxt-input__arrow"></i></span>
        <div v-if="openFilter === f.key" class="yxt-select__panel" role="listbox" :aria-label="f.label">
          <div
            v-for="opt in f.options"
            :key="opt.value"
            class="yxt-select__option"
            :class="{ 'is-selected': filters[f.key] === opt.value }"
            role="option"
            :aria-selected="filters[f.key] === opt.value"
            @click.stop="pick(f.key, opt.value)"
          >
            {{ opt.label }}
          </div>
        </div>
      </div>

      <div class="filter-item search-input">
        <span class="yxt-input__prefix" aria-hidden="true">
          <i class="yxt-input__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </i>
        </span>
        <input
          v-model="filters.keyword"
          class="yxt-input__inner"
          placeholder="搜索主题..."
          aria-label="搜索主题"
          @keyup.enter="fetchList"
        />
      </div>
    </div>

    <!-- FP-05 主题卡片列表 -->
    <div v-if="loading" class="list-tip">加载中…</div>
    <div v-else-if="themes.length === 0" class="empty-state">
      <p class="empty-text">暂无训练主题</p>
    </div>
    <div v-else class="page-container">
      <div class="project-grid">
        <div
          v-for="theme in themes"
          :key="theme.id"
          class="project-card"
          role="button"
          tabindex="0"
          @keydown.enter.prevent="goToDetail(theme.id)"
          @click="goToDetail(theme.id)"
        >
          <!-- 卡片操作区：绝对定位在右下角，避免与底部信息行挤在一起。
               原平台（台账 R1-1）操作按钮是悬浮出现，不是常驻；键盘聚焦到卡片内按钮时也显示，
               否则 Tab 键会停在一个看不见的按钮上。 -->
          <div class="card-actions">
            <button
              type="button"
              class="action-btn"
              :aria-label="`复制主题「${theme.themeName}」`"
              @click.stop="copyTheme(theme.themeName)"
            >复制</button>
          </div>
          <div class="card-header">
            <h3 class="card-title">{{ theme.themeName }}</h3>
            <span class="status-tag" :class="`status-${theme.status}`">{{ ACT_STATUS_TEXT[theme.status] }}</span>
          </div>
          <p class="card-desc">{{ theme.themeDesc || '暂无描述' }}</p>
          <div class="card-bottom">
            <div class="card-tags">
              <span class="config-tag" :class="`mode-${theme.themeMode}`">{{ ACT_THEME_MODE_TEXT[theme.themeMode] }}</span>
              <span class="config-tag">{{ theme.sourceType ? ACT_SOURCE_TYPE_TEXT[theme.sourceType] : '单独安排' }}</span>
            </div>
            <div class="card-meta">
              <span>学员 {{ theme.participantCount }} 人</span>
              <span class="meta-dot">·</span>
              <span>{{ formatUpdatedAt(theme.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && themes.length > 0" class="no-more-data">已加载全部数据</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getThemeList } from '@/api/actTheme'
import {
  ACT_SOURCE_TYPE_TEXT,
  ACT_STATUS_TEXT,
  ACT_THEME_MODE_TEXT
} from '@/types/actTheme'
import type { ActThemeCard } from '@/types/actTheme'
import { comingSoon } from './components/ui'

const router = useRouter()
const loading = ref(false)
const themes = ref<ActThemeCard[]>([])

/**
 * 归属/来源为占位展示：模型保留选中值，但查询时不加入请求参数。
 * 归属默认「我负责的」，与原平台列表页初始状态一致。
 */
const filters = ref({
  jurisdiction: '2',
  status: '' as '' | '0' | '1' | '2' | '3' | '4' | '5',
  themeMode: '' as '' | '1' | '2' | '3',
  sourceType: '',
  keyword: ''
})

interface SelectOption {
  label: string
  value: string
}

type FilterKey = 'jurisdiction' | 'status' | 'themeMode' | 'sourceType'

/**
 * 筛选项配置。控件按原平台手写（尺寸 160/148 x 32 取自视觉契约
 * visual/measured/admin-topic-list.json）：Element Plus 的 el-select 无法同时满足
 * 三种宽度、24x32 后缀与 4px/12px 内边距，故此处不复用通用控件。
 */
const SELECT_FILTERS: { key: FilterKey; label: string; options: SelectOption[] }[] = [
  {
    key: 'jurisdiction',
    label: '归属',
    options: [
      { label: '我管辖的', value: '1' },
      { label: '我负责的', value: '2' }
    ]
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '所有状态', value: '' },
      { label: '草稿', value: '0' },
      { label: '发布中', value: '1' },
      { label: '发布失败', value: '2' },
      { label: '已发布', value: '3' },
      { label: '已暂停', value: '4' },
      { label: '已结束', value: '5' }
    ]
  },
  {
    key: 'themeMode',
    label: '模式',
    options: [
      { label: '所有模式', value: '' },
      { label: '日常训练', value: '1' },
      { label: '通关考核', value: '2' },
      { label: '训考一体', value: '3' }
    ]
  },
  {
    key: 'sourceType',
    label: '来源',
    options: [
      { label: '来源', value: '' },
      { label: '单独安排', value: '1' },
      { label: '项目安排', value: '2' }
    ]
  }
]

/** 当前展开的下拉项（同一时刻只开一个） */
const openFilter = ref<'' | FilterKey>('')

const labelOf = (options: SelectOption[], value: string): string =>
  options.find((o) => o.value === value)?.label ?? ''

const toggleFilter = (key: FilterKey) => {
  openFilter.value = openFilter.value === key ? '' : key
}

/** 选中筛选项：状态/模式即时重新查询，归属/来源只改变展示值 */
const pick = (key: FilterKey, value: string) => {
  openFilter.value = ''
  if (key === 'jurisdiction') {
    filters.value.jurisdiction = value
    return
  }
  if (key === 'sourceType') {
    filters.value.sourceType = value
    return
  }
  if (value === filters.value[key]) return
  if (key === 'status') filters.value.status = value as typeof filters.value.status
  else filters.value.themeMode = value as typeof filters.value.themeMode
  fetchList()
}

/** 点击下拉以外的区域收起面板 */
const onDocumentMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  if (!target?.closest('.yxt-select')) openFilter.value = ''
}

const fetchList = async () => {
  loading.value = true
  try {
    const params: { page: number; pageSize: number; status?: number; themeMode?: number; keyword?: string } = {
      page: 1,
      pageSize: 100
    }
    if (filters.value.status !== '') params.status = Number(filters.value.status)
    if (filters.value.themeMode !== '') params.themeMode = Number(filters.value.themeMode)
    if (filters.value.keyword.trim()) params.keyword = filters.value.keyword.trim()
    const res = await getThemeList(params)
    themes.value = res.records || []
  } catch (e) {
    if (e instanceof Error && e.message) comingSoon(e.message)
    themes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown)
  fetchList()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
})

const goToDetail = (id: string) => {
  router.push(`/sparring/freesimulate/theme/${id}`)
}

/** FP-30/FP-43：创建新主题 → AI 设计助手对话页（themeId 为空 = 新建） */
const goCreate = () => {
  router.push('/sparring/freesimulate/assistant')
}

/** 从模板创建 / 查看产品介绍：原平台列表页的入口，本期未实现，按占位处理 */
const goTemplate = () => comingSoon('从模板创建功能建设中')
const showIntro = () => comingSoon('产品介绍建设中')

/** 卡片「复制」：与服务端复制接口未对接，先给出提示 */
const copyTheme = (name: string) => comingSoon(`复制「${name}」功能建设中`)

/** 更新时间：24 小时内显示相对时间，否则显示日期 */
function formatUpdatedAt(time: string | null): string {
  if (!time) return '-- 更新'
  const t = new Date(time.replace(/-/g, '/')).getTime()
  if (Number.isNaN(t)) return `${time} 更新`
  const diff = Date.now() - t
  if (diff < 60 * 60 * 1000) return '刚刚 更新'
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前 更新`
  const d = new Date(t)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} 更新`
}
</script>

<style scoped lang="scss">
/* 尺寸全部取自视觉契约 visual/measured/admin-topic-list.json（原平台 viewport 1509x887） */
.theme-list-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-ink);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 24px;

  .page-title {
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 700;
    line-height: 32px;
    color: var(--color-ink);
  }

  .page-desc {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-muted);
  }

  /* 三个按钮按行内块排布：原平台容器宽 344 = 84 + 16 + 110 + 12 + 122，
     font-size:0 消除标签间空白节点的宽度，保证总宽精确 */
  .header-actions {
    display: block;
    font-size: 0;
    line-height: 0;
  }

  .btn-template,
  .btn-create {
    display: inline-block;
    vertical-align: top;
    height: 32px;
    padding: 4px 19px;
    box-sizing: border-box;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    background: var(--color-paper);
    color: var(--color-ink);
    font-family: inherit;
    font-size: 14px;
    line-height: 22px;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }
  }

  /* 文字按钮：22 高压在 32 高的按钮行里，顶部下移 5px 与原平台基线一致 */
  .intro-toggle {
    display: inline-block;
    vertical-align: top;
    height: 22px;
    margin-top: 5px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--color-accent);
    font-family: inherit;
    font-size: 14px;
    line-height: 22px;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }
  }

  .btn-template {
    margin-left: 16px;
  }

  .btn-create {
    margin-left: 12px;
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-paper);
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 20px;
}

/* 下拉与搜索框共用输入框外观：高 32 / r4 / 1px #d9d9d9 / 14px #595959 */
.yxt-input__inner {
  width: 100%;
  height: 100%;
  padding: 4px 32px 4px 12px;
  box-sizing: border-box;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  color: var(--color-muted);
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
  outline: none;

  &::placeholder {
    color: var(--color-rule-2);
  }

  &.is-placeholder {
    color: var(--color-rule-2);
  }

  &:focus-visible {
    border-color: var(--color-accent);
  }
}

.yxt-select {
  position: relative;
  width: 160px;
  height: 32px;
  flex: none;
  cursor: pointer;

  &.select {
    width: 148px;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
}

/* 后缀箭头槽 24x32，图形箭头由 CSS 绘制（原平台无 emoji） */
.yxt-input__suffix {
  position: absolute;
  top: 0;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 32px;
  pointer-events: none;
}

.yxt-input__arrow {
  width: 6px;
  height: 6px;
  border-right: 1px solid var(--color-muted);
  border-bottom: 1px solid var(--color-muted);
  transform: translateY(-2px) rotate(45deg);
}

.yxt-select__panel {
  position: absolute;
  top: 34px;
  left: 0;
  z-index: 20;
  min-width: 100%;
  padding: 4px 0;
  border: 1px solid var(--color-rule);
  border-radius: 4px;
  background: var(--color-paper);
  box-shadow: 0 6px 16px color-mix(in oklab, var(--color-graphite) 8%, transparent);
}

.yxt-select__option {
  padding: 0 12px;
  color: var(--color-ink);
  font-size: 14px;
  line-height: 30px;
  white-space: nowrap;

  &:hover {
    background: var(--color-paper-2);
  }

  &.is-selected {
    color: var(--color-accent);
    font-weight: 500;
  }
}

/* 搜索框外层只占位，白底与圆角在内层 input 上（契约：外层 radius 0 / 无背景） */
.search-input {
  position: relative;
  width: 240px;
  height: 32px;
  flex: none;
  border: 0 solid var(--color-rule);

  .yxt-input__inner {
    padding: 4px 12px 4px 32px;
  }
}

.yxt-input__prefix {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  pointer-events: none;
}

.yxt-input__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 32px;
  color: var(--color-muted);
}

/* 负外边距把网格对齐回 1253 的内容列宽（原平台 .page-container 同款处理） */
.page-container {
  margin: -8px -12px;
  padding: 8px 12px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  border: 1px solid var(--color-rule);
  border-radius: 12px;
  background: var(--color-paper);
  cursor: pointer;
  // 批注6（2026-11-20）：实战训练项目卡片 → 悬停抬 2px + 投影加深 + 边框提亮，按下回落收影。
  // 与话术训练 index.vue 的 .project-card 保持同一套数值；只列具体属性，禁 transition: all
  transition:
    transform var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out);
  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-accent-wash);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--color-graphite) 12%, transparent);
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px color-mix(in oklab, var(--color-graphite) 10%, transparent);
  }
}

/* 台账 R1-1：操作区默认隐藏，鼠标悬浮卡片（或键盘进入卡片内的按钮）才出现。
   用 opacity 而不是 display，保证按钮仍在无障碍树与 Tab 序列里，只是视觉隐藏。 */
.card-actions {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;

  .project-card:hover &,
  .project-card:focus-within & {
    opacity: 1;
    pointer-events: auto;
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 86px;
  height: 32px;
  padding: 4px 16px;
  box-sizing: border-box;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  color: var(--color-muted);
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px;
}

.card-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--color-ink);
  font-size: 16px;
  font-weight: 700;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 24px;
  padding: 0 6px;
  box-sizing: border-box;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper-2);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
}

.status-tag.status-1,
.status-tag.status-5 {
  border-color: var(--color-accent-wash);
  background: var(--color-accent-wash);
  color: var(--color-accent);
}

.status-tag.status-2 {
  border-color: color-mix(in oklab, var(--color-error) 25%, var(--color-paper));
  background: color-mix(in oklab, var(--color-error) 8%, var(--color-paper));
  color: var(--color-error-deep);
}

.status-tag.status-3 {
  border-color: color-mix(in oklab, var(--color-success) 30%, var(--color-paper));
  background: color-mix(in oklab, var(--color-success) 8%, var(--color-paper));
  color: var(--color-success);
}

.status-tag.status-4 {
  border-color: color-mix(in oklab, var(--color-warning) 40%, var(--color-paper));
  background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  color: var(--color-warning);
}

/* 描述固定两行高度：卡片高度与原平台一致（44.8 + 页内外边距 = 161） */
.card-desc {
  display: -webkit-box;
  min-height: 44.8px;
  margin: 0 0 16px;
  overflow: hidden;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 22.4px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 6px;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 2px 8px;
  box-sizing: border-box;
  border-radius: 6px;
  background: var(--color-paper-2);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
}

.config-tag.mode-1 {
  background: var(--color-accent-wash);
  color: var(--color-accent);
}

.config-tag.mode-3 {
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 22px;
}

.meta-dot {
  color: var(--color-rule-2);
}

.no-more-data {
  width: 100%;
  padding: 24px 0;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 22px;
  text-align: center;
}

.list-tip,
.empty-state {
  padding: 24px 0;
  color: var(--color-muted);
  font-size: 14px;
  text-align: center;
}

.empty-text {
  margin: 0;
}
</style>
