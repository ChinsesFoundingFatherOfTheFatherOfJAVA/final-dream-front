<template>
  <!-- F6/F7/F8/F9/F10/F12 考试详情：页头 + 三 tab（考生情况 / 试题分析 / 统计分析） -->
  <div class="detail-page">
    <header class="detail-header">
      <el-button class="back-btn" aria-label="返回" @click="goBack">‹</el-button>
      <h1 class="exam-name">
        {{ arrange?.name || '考试详情' }}
        <span class="status-tag" :class="'s' + (arrange?.status ?? 0)">{{ statusText }}</span>
      </h1>
      <div class="header-actions">
        <el-button class="btn" @click="openLink">考试链接</el-button>
        <el-button class="btn" @click="showNotice = true">变更通知</el-button>
        <el-button v-if="arrange && arrange.status === 0" class="btn primary" @click="doPublish">发布</el-button>
        <el-button v-if="arrange && arrange.status === 2" class="btn" @click="doEnd">结束考试</el-button>
      </div>
    </header>

    <!--
      ===== 基本信息（F6 / API-09）=====
      原平台把它放在页头之下、tab 之上（实测卡片 y147..403）。
      左右各一列，行距 34px：左列 5 项（分类/入场时间/发布时间/创建人/来源），
      右列 3 项（状态/总分/使用试卷）。
      右列比左列少 2 行是原平台原样——不补空占位，不强行对齐。
      考试链接与二维码按用户要求本期不做。
    -->
    <section class="basic-info">
      <div class="bi-title">基本信息</div>
      <div class="bi-body">
        <div class="bi-col">
          <div class="bi-row">
            <span class="bi-label">考试分类：</span>
            <span class="bi-value">{{ arrange?.catalogName || '--' }}</span>
          </div>
          <div class="bi-row">
            <span class="bi-label">入场时间：</span>
            <span class="bi-value">
              {{ formatMinute(arrange?.entryStartAt) }} 至 {{ formatMinute(arrange?.entryEndAt) }}
            </span>
          </div>
          <div class="bi-row">
            <span class="bi-label">发布时间：</span>
            <span class="bi-value">{{ formatMinute(arrange?.publishedAt) }}</span>
          </div>
          <div class="bi-row">
            <span class="bi-label">创建人：</span>
            <span class="bi-value">{{ arrange?.createFullname || arrange?.createUserName || '--' }}</span>
          </div>
          <div class="bi-row">
            <span class="bi-label">来源：</span>
            <span class="bi-value">{{ sourceText }}</span>
          </div>
        </div>

        <div class="bi-col">
          <div class="bi-row">
            <span class="bi-label">考试状态：</span>
            <span class="bi-status" :class="'s' + (arrange?.status ?? 0)">{{ statusText }}</span>
          </div>
          <div class="bi-row">
            <span class="bi-label">试卷总分：</span>
            <span class="bi-value">{{ formatScore(arrange?.paperScore) }}</span>
          </div>
          <div class="bi-row">
            <span class="bi-label">使用试卷：</span>
            <span class="bi-paper">
              <span class="bi-paper-name">{{ arrange?.paperName || '--' }}</span>
              <span v-if="arrange?.secrecy === 1" class="bi-tag-secrecy">保密</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <div class="tabs">
      <el-button class="tab" :class="{ active: tab === 'student' }" @click="tab = 'student'">考生情况</el-button>
      <el-button class="tab" :class="{ active: tab === 'question' }" @click="tab = 'question'">试题分析</el-button>
      <el-button class="tab" :class="{ active: tab === 'analysis' }" @click="tab = 'analysis'">统计分析</el-button>
    </div>

    <!-- ===== 考生情况 ===== -->
    <section v-if="tab === 'student'" class="list-card">
      <div class="toolbar-row">
        <el-button class="btn primary" @click="showAdd = true">添加学员</el-button>
        <el-button class="btn" :disabled="!selectedIds.size" @click="doRemove">批量移除</el-button>
        <el-button class="btn" :disabled="selectedIds.size !== 1" @click="doRetakeSelected">安排补考</el-button>
        <el-button class="btn" @click="doSync">同步试卷</el-button>
        <el-button class="btn" @click="doAnalyze">分析数据</el-button>
        <el-button class="btn" :disabled="!selectedIds.size" @click="doUrge">催促</el-button>
        <el-button class="btn" @click="showSignature = true">签名记录</el-button>
        <!-- 列设置入口不在工具栏：原平台是「操作」列表头右侧的小齿轮（见下方表格 #header） -->
        <el-button class="btn export-btn" @click="openExportMenu($event)">导出数据</el-button>
      </div>

      <!-- 筛选项对齐原平台 8 项：账号状态 / 考试状态 / 通过状态 / 加入方式 /
           部门 / 岗位 / 开考开始时间 / 开考结束时间（+ 姓名账号搜索） -->
      <div class="filter-row">
        <el-select v-model="query.accountStatus" class="filter-select" aria-label="账号状态" @change="reload(1)">
          <el-option :value="-1" label="账号状态" />
          <el-option :value="1" label="已启用" />
          <el-option :value="2" label="已禁用" />
          <el-option :value="3" label="已删除" />
        </el-select>
        <el-select v-model="query.examStatus" class="filter-select" aria-label="考试状态" @change="reload(1)">
          <el-option :value="-1" label="考试状态" />
          <el-option :value="0" label="未开始" />
          <el-option :value="1" label="考试中" />
          <el-option :value="2" label="批阅中" />
          <el-option :value="3" label="已完成" />
          <el-option :value="4" label="重新考试" />
        </el-select>
        <el-select v-model="query.passStatus" class="filter-select" aria-label="通过状态" @change="reload(1)">
          <el-option :value="-1" label="通过状态" />
          <el-option :value="1" label="通过" />
          <el-option :value="0" label="不通过" />
          <el-option :value="2" label="未知" />
        </el-select>
        <el-select v-model="joinTypeFilter" class="filter-select" aria-label="加入方式" @change="onJoinTypeChange">
          <el-option :value="-1" label="加入方式" />
          <el-option v-for="(label, value) in STUDENT_JOIN_TYPE_TEXT" :key="value" :value="Number(value)" :label="label" />
        </el-select>
        <el-cascader
          v-model="deptPathFilter"
          class="filter-cascader"
          :options="deptOptions"
          :props="{ value: 'deptPath', label: 'label', children: 'children', checkStrictly: true, emitPath: true }"
          clearable
          placeholder="请选择部门"
          aria-label="选择部门"
          @change="onDeptChange"
        />
        <el-select v-model="positionNamesFilter" class="filter-select" multiple collapse-tags clearable
          aria-label="选择岗位" placeholder="选择岗位" @change="reload(1)">
          <el-option v-for="p in positionOptions" :key="p" :value="p" :label="p" />
        </el-select>
        <el-date-picker v-model="startBeginFilter" class="filter-date" type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss" placeholder="开考开始时间" aria-label="开考开始时间"
          :teleported="true" @change="reload(1)" />
        <el-date-picker v-model="startEndFilter" class="filter-date" type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss" placeholder="开考结束时间" aria-label="开考结束时间"
          :teleported="true" @change="reload(1)" />
        <el-input v-model.trim="query.keyword" class="filter-search" placeholder="姓名/账号搜索" @keyup.enter="reload(1)" />
        <el-button class="btn primary filter-submit" @click="reload(1)">查询</el-button>
      </div>

      <div class="table-wrap">
        <!--
          表格宽度**不再**用内联固定像素（2026-11-13 修正）。

          曾经的错误做法：给 el-table 设 `:style="{width: 2834px}"` + 外层 overflow:auto，
          靠外层 div 产生横向滚动。后果是 **el-table 自己的滚动容器不再滚动**，
          而 `fixed="right"` 的固定列是用 position:sticky 贴在这个内部容器上的——
          容器不滚，sticky 就贴在 2834px 的边缘（视口外），固定列形同虚设，
          列设置齿轮也跟着跑到看不见的地方。

          正确做法：交给 el-table 原生滚动。列宽已是固定 `width`，
          总宽 2834px 必然超过容器 1277px，el-table 会自己在内部横向滚动，
          `fixed="right"` 的 sticky 才能贴合真实可视区右缘。
        -->
        <!--
          用 el-table 自带的 `max-height` 管高度（2026-11-13，用户指正）。

          **之前的错误**：用 `.table-wrap { min-height: calc(表头 + 行高 × 每页条数) }`
          强行撑高。选「100 条/页」但只有 8 条数据时，容器被撑到 5000+ px，
          下面全是空白——把「保底可见」做成了「制造空白」。

          **正确做法**：交给 Element Plus。
          - `max-height` 只在**内容超过**该高度时才生效，此时表格内部纵向滚动、
            表头固定不动（EP 原生行为）；
          - 数据少时表格按实际行数自适应，不会留空白。
          这正好是「弹性」：有数据才占地方，没数据就缩回去。

          高度取 `calc(100vh - 320px)`：扣掉页头、基本信息卡、tab、工具栏、
          筛选区与分页条约 320px，让表格大致填满剩余视口。不做成写死像素，
          换屏幕尺寸也不用重算。
        -->
        <el-table
          :data="students"
          row-key="id"
          empty-text="暂无考生，点「添加学员」安排"
          max-height="calc(100vh - 320px)"
        >
          <el-table-column width="44" align="center">
            <template #header>
              <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll" />
            </template>
            <template #default="{ row }">
              <el-checkbox :model-value="selectedIds.has(row.id)" @change="toggleSelect(row.id, Boolean($event))" />
            </template>
          </el-table-column>
          <!--
            列宽用 `width` 而不是 `min-width`（2026-11-13 修）：

            min-width 只声明下限，el-table 在容器不够宽时会**压缩列宽**去适配，
            结果 26 列被挤进 1277px，right 一半（含「操作」列和列设置齿轮）跑到
            视口外且不出现横向滚动条 —— 等于点不到。

            改成固定 width 后，el-table 算出的总宽（26×110 ≈ 2860px）必然超出容器，
            由外层 .table-wrap 的 overflow:auto 提供横向滚动，行为与原平台一致。
          -->
          <el-table-column
            v-for="c in tableColumns"
            :key="c"
            :label="columnLabel(c)"
            :width="colWidth(c)"
            :fixed="c === 'operation' ? 'right' : false"
          >
            <!-- 「操作」列表头右侧的小齿轮即列设置入口（原平台实测：齿轮在表头单元格最右，
                 距「操作」文字约 40px）。放在 #header 而不是工具栏，是为了让入口贴着它
                 所作用的表格；工具栏里那个「列设置」文字按钮已去掉。 -->
            <template v-if="c === 'operation'" #header>
              <span class="op-head">
                <span>{{ columnLabel(c) }}</span>
                <button
                  type="button"
                  class="col-gear"
                  aria-label="列设置"
                  title="列设置"
                  @click.stop="showColumns = true"
                >
                  <el-icon aria-hidden="true"><Setting /></el-icon>
                </button>
              </span>
            </template>
            <template #default="{ row }">
              <template v-if="c === 'account'">{{ row.account || '--' }}</template>
              <template v-else-if="c === 'fullname'">{{ row.fullname || '--' }}</template>
              <template v-else-if="c === 'accountStatus'">{{ STUDENT_ACCOUNT_STATUS_TEXT[row.accountStatus] ?? '--' }}</template>
              <template v-else-if="c === 'deptName'">{{ row.deptName || '--' }}</template>
              <template v-else-if="c === 'positionName'">{{ row.positionName || '--' }}</template>
              <template v-else-if="c === 'joinType'">{{ STUDENT_JOIN_TYPE_TEXT[row.joinType] ?? '--' }}</template>
              <template v-else-if="c === 'joinSource'">
                {{ row.joinSource == null ? '--' : (STUDENT_JOIN_SOURCE_TEXT[row.joinSource] ?? row.joinSource) }}
              </template>
              <template v-else-if="c === 'examStatus'">{{ STUDENT_STATUS_TEXT[row.examStatus] ?? '--' }}</template>
              <template v-else-if="c === 'startAt'">{{ row.startAt || '--' }}</template>
              <template v-else-if="c === 'submitAt'">{{ row.submitAt || '--' }}</template>
              <template v-else-if="c === 'firstJoinAt'">{{ row.firstJoinAt || '--' }}</template>
              <template v-else-if="c === 'ip'">{{ row.ip || '--' }}</template>
              <template v-else-if="c === 'durationSec'">{{ formatDurationSec(row.durationSec) }}</template>
              <template v-else-if="c === 'score'">{{ row.score ?? 0 }}</template>
              <template v-else-if="c === 'highestAttemptNo'">
                {{ row.highestAttemptNo ? `第${row.highestAttemptNo}次` : '--' }}
              </template>
              <template v-else-if="c === 'screenSwitchCount'">{{ row.screenSwitchCount ?? 0 }}</template>
              <template v-else-if="c === 'submitType'">
                {{ row.submitType == null ? '--' : (STUDENT_SUBMIT_TYPE_TEXT[row.submitType] ?? row.submitType) }}
              </template>
              <template v-else-if="c === 'rankNo'">{{ row.rankNo ? row.rankNo : '--' }}</template>
              <template v-else-if="c === 'passStatus'">
                <el-tag :type="row.passStatus === 1 ? 'success' : row.passStatus === 0 ? 'danger' : 'info'">
                  {{ STUDENT_PASS_TEXT[row.passStatus] ?? '--' }}
                </el-tag>
              </template>
              <template v-else-if="c === 'retakeScore'">{{ row.retakeScore ?? '--' }}</template>
              <template v-else-if="c === 'retakePassStatus'">
                <el-tag
                  v-if="row.retakePassStatus != null"
                  :type="row.retakePassStatus === 1 ? 'success' : 'danger'"
                >
                  {{ row.retakePassStatus === 1 ? '通过' : '不通过' }}
                </el-tag>
                <span v-else>--</span>
              </template>
              <template v-else-if="c === 'referDevice'">
                {{ row.referDevice == null ? '--' : (STUDENT_REFER_DEVICE_TEXT[row.referDevice] ?? row.referDevice) }}
              </template>
              <template v-else-if="c === 'referCount'">{{ row.referCount ?? 0 }}</template>
              <template v-else-if="c === 'oncePassed'">{{ row.oncePassed === 1 ? '是' : '否' }}</template>
              <template v-else-if="c === 'hasRetake'">{{ row.hasRetake === 1 ? '是' : '否' }}</template>
              <!--
                操作列：原平台是「答卷」+「更多∨」两个文字链，其余动作收进下拉。

                DER-36（用户 2026-11-13 拍板）：原平台「更多」菜单的显隐规则勘探不出规律
                （未开始只有「移除」、已完成也只有「移除」、其余状态无样本），故不仿照它，自定口径：
                  - 移除：**始终显示** —— 任何状态都能把考生移出本场考试；
                  - 重考：仅 canRetake === true 时显示
                    （后端：submitted && (retakeUsed == null || retakeUsed == 0)）；
                  - 其余动作不进「更多」。
              -->
              <template v-else-if="c === 'operation'">
                <div class="op-links">
                  <el-button v-if="row.currentAttemptId" link type="primary" @click="openResult(row)">答卷</el-button>
                  <el-dropdown trigger="click" @command="(cmd: string) => onMoreCommand(cmd, row)">
                    <el-button link type="primary" class="more-trigger">
                      更多<el-icon class="caret" aria-hidden="true"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <!-- 移除恒显示（DER-36） -->
                        <el-dropdown-item command="remove">移除</el-dropdown-item>
                        <!-- 重考按 canRetake 显隐（DER-36） -->
                        <el-dropdown-item v-if="row.canRetake" command="retake">重考</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <!--
        分页（2026-11-13 补全）：

        原平台有「共 N 条 / 每页条数下拉 / 页码 / 前往第 N 页」四件套。
        原先只有 `layout="prev, pager, next"` —— 不能在页内改每页条数，
        也不能跳页，考生多时只能一页页点。

        用 el-pagination 官方 layout 组合实现，不手写控件：
        total(共N条) sizes(每页N条) prev pager next jumper(前往N页)。
      -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pageNo"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="reload"
          @size-change="onPageSizeChange"
        />
      </div>
    </section>

    <!-- ===== 试题分析（F13 / API-32~34） ===== -->
    <QuestionAnalysisTab v-else-if="tab === 'question'" :arrange-id="arrangeId" />

    <!-- ===== 统计分析（F14 / API-36~38） ===== -->
    <AnalysisTab v-else :arrange-id="arrangeId" />

    <AddStudentDrawer v-if="showAdd" :arrange-id="arrangeId" @close="showAdd = false" @added="onAdded" />
    <SignatureDrawer v-if="showSignature" :arrange-id="arrangeId" @close="showSignature = false" />
    <ColumnSettingDrawer v-if="showColumns" @close="showColumns = false" @saved="onColumnsSaved" />
    <ChangeNoticeDrawer v-if="showNotice" :arrange-id="arrangeId" @close="showNotice = false" />

    <!-- F3/API-27 导出菜单：仅最高成绩 / 所有成绩 / 学员答卷 -->
    <div v-if="exportMenu.visible" class="dropdown-mask" @click="exportMenu.visible = false">
      <div class="float-menu" :style="{ left: exportMenu.x + 'px', top: exportMenu.y + 'px' }">
        <div class="menu-item" role="button" tabindex="0" @click="doExport('highest')" @keydown.enter.prevent="doExport('highest')">仅导出最高成绩</div>
        <div class="menu-item" role="button" tabindex="0" @click="doExport('all')" @keydown.enter.prevent="doExport('all')">导出所有成绩</div>
        <div class="menu-item" role="button" tabindex="0" @click="doExport('answer')" @keydown.enter.prevent="doExport('answer')">导出学员答卷</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowDown, Setting } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import AddStudentDrawer from './components/AddStudentDrawer.vue'
import SignatureDrawer from './components/SignatureDrawer.vue'
import QuestionAnalysisTab from './components/QuestionAnalysisTab.vue'
import AnalysisTab from './components/AnalysisTab.vue'
import ColumnSettingDrawer from './components/ColumnSettingDrawer.vue'
import ChangeNoticeDrawer from './components/ChangeNoticeDrawer.vue'
import {
  analyzeArrange, batchArrange, endArrange, getArrangeDetail, getArrangeLink, getArrangeStudents,
  exportArrangeStudents, getStudentColumns, publishArrange, removeArrangeStudents,
  retakeArrangeStudent, syncArrangePaper, urgeArrangeStudents,
  ARRANGE_TYPE_TEXT,
  STUDENT_ACCOUNT_STATUS_TEXT, STUDENT_COLUMN_LABELS, STUDENT_JOIN_SOURCE_TEXT,
  STUDENT_JOIN_TYPE_TEXT, STUDENT_PASS_TEXT, STUDENT_REFER_DEVICE_TEXT,
  STUDENT_STATUS_TEXT, STUDENT_SUBMIT_TYPE_TEXT,
  getArrangeDepartments, getArrangePositions,
  type ArrangeColumnSetting,
  type ArrangeDepartmentOption, type ArrangeDetail, type ArrangeStudentItem,
  type ArrangeStudentQuery
} from '@/api/arrange'

const route = useRoute()
const router = useRouter()
const arrangeId = String(route.query.arrangeId ?? '')

const arrange = ref<ArrangeDetail | null>(null)
const tab = ref<'student' | 'question' | 'analysis'>(
  (String(route.query.tab ?? 'student') as 'student' | 'question' | 'analysis'))
const students = ref<ArrangeStudentItem[]>([])
const total = ref(0)
const pageNo = ref(1)
/**
 * 每页条数（2026-11-13 改为可切换）。
 *
 * <p>原先写死为常量 10，分页器只能翻页、不能改每页数量。原平台允许
 * 10/20/50/100 四档，考生多时一次看更多行更省事，故改为 ref。
 */
const pageSize = ref(10)

/**
 * 改每页条数后回到第 1 页重查。
 *
 * <p>必须回第 1 页：若停在原来的第 3 页而新页大小让总页数只剩 2 页，
 * 会查出一个空列表，用户以为数据没了。这是分页器的经典坑。
 */
const onPageSizeChange = () => {
  pageNo.value = 1
  reload()
}
const selectedIds = ref(new Set<string>())
const showAdd = ref(false)
const showSignature = ref(false)
const showColumns = ref(false)
const showNotice = ref(false)
const exportMenu = reactive<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
/** 列表列（按用户列设置过滤 + 排序；账号/姓名/操作是保留列） */
const columnSetting = ref<ArrangeColumnSetting[]>([])
/**
 * 表格实际展示的列。
 *
 * <p>**为什么要兼容「库里存的是旧列集」**（2026-11-13）：列设置是持久化的，
 * 而这一版把可选列从 11 项扩到了 26 项。此前保存过列设置的用户，
 * 库里只有旧的那几条记录，直接按它渲染会导致**新加的列一个都看不到**
 * （实测：库里 4 条记录 → 表格只出账号/姓名/操作三列）。
 *
 * <p>处理方式：以库里的设置为准（尊重用户自定义的显隐与顺序），
 * 但把「库里没有、而当前版本已支持」的新列**按默认顺序补在末尾、且默认可见**。
 * 这样既不会把用户手动隐藏的列翻出来，也不会让新列凭空消失。
 */
const tableColumns = computed(() => {
  const allKeys = Object.keys(STUDENT_COLUMN_LABELS)
  const saved = columnSetting.value

  // 没有保存过设置：全量默认顺序
  if (!saved.length) return allKeys

  const savedKeys = new Set(saved.map((c) => c.key))
  const fromSaved = saved.filter((c) => c.visible).map((c) => c.key)
  // 库里没有的新列：补在末尾（操作列保持最后）
  const missing = allKeys.filter((k) => !savedKeys.has(k))

  const merged = [...fromSaved, ...missing]
  // 「操作」永远压尾，否则补进来的新列会排在它后面，与原平台布局不符
  const opIdx = merged.indexOf('operation')
  if (opIdx >= 0) merged.push(...merged.splice(opIdx, 1))

  return merged.filter((k) => STUDENT_COLUMN_LABELS[k])
})


/**
 * 各列的显示宽度（2026-11-13）。
 *
 * <p>**为什么不能一刀切 110px**：实测把 26 列全设 110px 后，姓名
 * （`Aashik Mahaboo Basha`）、岗位（`外籍大客户经理`）、时间列全被截成
 * `A Michael D...` 这种，肉眼分不清是谁。列宽必须按内容类型给。
 *
 * <p>取值依据：账号/成绩/次数等短数字 110；姓名与岗位 140（中文岗位名
 * 大多 6~8 字，140px 能完整放下）；部门 160；时间列 150（`2026-11-11 16:27:10`
 * 需要这个宽度才不折断）；操作列 150（放「答卷 + 更多」两个链接）。
 */
const colWidth = (key: string): number => {
  switch (key) {
    case 'operation': return 150
    case 'fullname':
    case 'positionName': return 140
    case 'deptName': return 160
    case 'startAt':
    case 'submitAt':
    case 'firstJoinAt': return 150
    case 'ip': return 130
    default: return 110
  }
}

const columnLabel = (key: string) => STUDENT_COLUMN_LABELS[key] ?? key
const colClass = (key: string) =>
  key === 'submitAt' ? 'col-time' : key === 'operation' ? 'col-op' : key === 'account' || key === 'fullname' || key === 'deptName' || key === 'positionName' ? '' : 'col-sm'

const query = reactive<ArrangeStudentQuery>({
  keyword: '', examStatus: -1, passStatus: -1, accountStatus: -1
})

// ---- 筛选区专用状态 ----
// 这些控件在 UI 上的值与 query 里的筛选参数不是一一对应（部门要转成末级 ID、
// 加入方式要兼容 -1），所以单独存一层，提交时再回写 query。
const joinTypeFilter = ref(-1)
const deptPathFilter = ref<string[]>([])
const positionNamesFilter = ref<string[]>([])
const startBeginFilter = ref('')
const startEndFilter = ref('')
const departments = ref<ArrangeDepartmentOption[]>([])
const positionOptions = ref<string[]>([])

/**
 * 部门树选项：后端给的是扁平 path 列表，这里按 `->` 层级拼成 cascader 能吃的树。
 *
 * <p>值用 `deptPath`（唯一且稳定），提交前再按选中的 path 找回对应的部门 id；
 * 因为列表里存的是 `dept_id`（sys_department.id），不能直接传 path。
 */
type DeptTreeNode = { label: string; deptPath: string; deptId: string; children: DeptTreeNode[] }
const deptOptions = computed<DeptTreeNode[]>(() => {
  const roots: DeptTreeNode[] = []
  const byPath = new Map<string, DeptTreeNode>()
  for (const d of departments.value) {
    const node: DeptTreeNode = {
      label: d.deptName,
      deptPath: d.deptPath,
      deptId: d.id ? String(d.id) : (d.deptId ?? ''),
      children: []
    }
    byPath.set(d.deptPath, node)
    const parentPath = d.parentPath && d.parentPath !== d.deptPath ? d.parentPath : ''
    const parent = parentPath ? byPath.get(parentPath) : undefined
    // 父节点按 path 排序先到，拿不到父节点就挂根上，不让一个孤儿节点丢掉整个选项
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
})

/** 选完部门后：把选中 path（以及它所有子部门）对应成的 deptId 写进 query。 */
const onDeptChange = () => {
  const picked = deptPathFilter.value
  if (!picked || !picked.length) {
    query.deptIds = []
  } else {
    // 选父部门要包含子部门：按 path 前缀匹配，与 StaffManagement 的部门展开口径一致
    const prefix = picked[picked.length - 1]
    const ids = departments.value
      .filter(d => d.deptPath === prefix || d.deptPath.startsWith(prefix + '->'))
      .map(d => (d.id ? String(d.id) : (d.deptId ?? '')))
      .filter(Boolean)
    query.deptIds = ids
  }
  reload(1)
}

const onJoinTypeChange = () => {
  query.joinType = joinTypeFilter.value > 0 ? joinTypeFilter.value : undefined
  reload(1)
}

/** 答题时长展示：与原平台「答题时长」同口径（秒 → mm:ss，超 1 小时带小时段）。 */
const formatDurationSec = (sec: number | null | undefined) => {
  if (sec == null || Number.isNaN(Number(sec)) || Number(sec) < 0) return '--'
  const total = Math.round(Number(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * 提交前把筛选区的值同步进 query。
 *
 * <p>单独抽出来是因为「查询」按钮、回车搜索、以及各下拉自己的 @change 都要走同一条口径；
 * 让它幂等，反复调不会把 query 越改越偏。
 */
const syncQuery = () => {
  query.joinType = joinTypeFilter.value > 0 ? joinTypeFilter.value : undefined
  query.positionNames = positionNamesFilter.value.length ? positionNamesFilter.value : undefined
  query.examStartBegin = startBeginFilter.value || undefined
  query.examStartEnd = startEndFilter.value || undefined
}


/**
 * 时间只显示到分钟。
 *
 * <p>原平台基本信息的时间实测形如「2026-07-28 10:00」「2026-07-23 14:11」——
 * 秒对管理员无意义，而且多两位会把整行拉长。接口给的是 `yyyy-MM-dd HH:mm:ss`，
 * 所以统一截到 16 位；纯日期或其它形状原样返回，不猜。
 */
const formatMinute = (value: string | null | undefined): string => {
  if (!value) return '--'
  const text = String(value)
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text) ? text.slice(0, 16) : text
}

/**
 * 试卷总分：整数不带小数、小数去尾零（100 分不显示成 100.00）。
 *
 * <p>不能直接用 `paperScore`：后端是 BigDecimal，序列化后是 100.00，
 * 而原平台显示的是「100分」——带两位小数会让人以为分值精度到厘。
 */
const formatScore = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(Number(value))) return '--'
  const num = Number(value)
  return `${Number.isInteger(num) ? num : Number(num.toFixed(2))}分`
}

/**
 * 来源文案。
 *
 * <p>原平台实测显示为「普通考试」，但**契约里没有对应的来源字段**：
 * `07` 建表 SQL 无来源列，`04 §11.9` 的 ArrangeDetail 也无该字段，
 * 且 `01 §2.2` 与偏差记录 D-15 明确「来源列与来源业务字段本期不做」。
 * 所以不能硬编成「普通考试」冒充有数据——全部考试都显示同一个值等于说谎。
 *
 * <p>现有数据里能区分的只有 `arrangeType`（单独安排 / 批量安排），
 * 就以它为口径；后续补了真来源字段，只改这一个函数即可。
 */
const sourceText = computed(() => {
  const type = arrange.value?.arrangeType
  if (type == null) return '--'
  return ARRANGE_TYPE_TEXT[type] ?? '--'
})

const statusText = computed(() => {
  const s = arrange.value?.status ?? 0
  return s === 0 ? '未发布' : s === 2 ? '进行中' : s === 3 ? '已结束' : '--'
})
const allChecked = computed(() =>
  students.value.length > 0 && students.value.every(s => selectedIds.value.has(s.id)))
const someChecked = computed(() =>
  students.value.some(s => selectedIds.value.has(s.id)) && !allChecked.value)

const loadArrange = async () => {
  if (!arrangeId) {
    toast.error('缺少考试 id')
    return
  }
  try {
    arrange.value = await getArrangeDetail(arrangeId)
  } catch { /* 拦截器已提示 */ }
}

const reload = async (next?: number) => {
  if (next) pageNo.value = next
  // 每次查询都把筛选区的最新值同步进 query，避免「改了条件但忘点查询」拿到旧口径
  syncQuery()
  try {
    const res = await getArrangeStudents(arrangeId, pageNo.value, pageSize.value, query)
    students.value = res.records || []
    total.value = res.total || 0
  } catch { /* 拦截器已提示 */ }
}

const toggleSelect = (id: string, checked: boolean) => {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}
const toggleAll = (checked: boolean) => {
  const next = new Set(selectedIds.value)
  for (const s of students.value) {
    if (checked) next.add(s.id)
    else next.delete(s.id)
  }
  selectedIds.value = next
}

const onAdded = () => {
  showAdd.value = false
  selectedIds.value = new Set()
  reload()
  loadArrange()
}

/**
 * 移除指定考生（批量与行内「移除」共用）。
 *
 * <p>抽出来的原因：行内「更多 → 移除」与工具栏「批量移除」必须走**同一套**流程——
 * 特别是 40004「已有作答记录」的二次确认 + 强制移除（force=true），
 * 两处各写一遍必然漂移，最后一边能强除一边不能，用户会以为功能坏了。
 */
const removeStudents = async (ids: string[]) => {
  if (!ids.length) return
  const ok = await confirmDialog({
    title: `确认移除 ${ids.length} 位考生？`,
    message: '已有作答记录的考生会被拦截，需要再确认一次强制移除',
    danger: true
  })
  if (!ok) return
  try {
    await removeArrangeStudents(arrangeId, ids, false)
    toast.success('已移除')
    selectedIds.value = new Set()
    reload(); loadArrange()
  } catch {
    // 40004：有人已有作答记录 —— 二次确认后强制移除
    const force = await confirmDialog({
      title: '部分考生已有作答记录',
      message: '强制移除会同时保留历史答卷，仅把该考生移出名单。确定继续？',
      danger: true
    })
    if (!force) return
    try {
      await removeArrangeStudents(arrangeId, ids, true)
      toast.success('已强制移除')
      selectedIds.value = new Set()
      reload(); loadArrange()
    } catch { /* 拦截器已提示 */ }
  }
}

/** 工具栏「批量移除」：作用于勾选行 */
const doRemove = async () => {
  await removeStudents(Array.from(selectedIds.value))
}

/**
 * 行内「更多 → 移除」：只作用于当前行。
 *
 * <p>不能用 doRemove —— 那个读的是 selectedIds，用户没勾选时点行内移除会静默无反应。
 */
const doRemoveRow = async (row: ArrangeStudentItem) => {
  await removeStudents([row.id])
}

const doRetake = async (row: ArrangeStudentItem) => {
  const ok = await confirmDialog({
    title: `确认为「${row.fullname}」安排补考？`,
    message: '每位考生只允许补考一次',
    danger: false
  })
  if (!ok) return
  try {
    const res = await retakeArrangeStudent(arrangeId, row.id)
    toast.success(`已安排补考（第 ${res.attemptNo} 次）`)
    reload()
  } catch { /* 拦截器已提示 */ }
}

const doRetakeSelected = async () => {
  const row = students.value.find(s => selectedIds.value.has(s.id))
  if (row) await doRetake(row)
}

/**
 * 行内「更多」下拉的命令分发。
 *
 * <p>口径见模板处注释（DER-36）：移除恒可用、重考仅 canRetake 时出现。
 * 这里再用 canRetake 守一道，是因为命令值是从 DOM 传回来的——
 * 菜单项隐藏只约束 UI，不改调用入口，两个入口都该自洽。
 */
const onMoreCommand = async (command: string, row: ArrangeStudentItem) => {
  if (command === 'remove') {
    await doRemoveRow(row)
  } else if (command === 'retake') {
    if (!row.canRetake) return
    await doRetake(row)
  }
}

const doSync = async () => {
  const ok = await confirmDialog({
    title: '同步试卷到本场考试？',
    message: '「未作答」只影响尚未交卷的考生；历史答卷不受影响',
    danger: false
  })
  if (!ok) return
  try {
    const res = await syncArrangePaper(arrangeId, 'unanswered')
    toast.success(`已同步，影响 ${res.affectedCount} 条作答记录`)
  } catch { /* 拦截器已提示 */ }
}

const doAnalyze = async () => {
  const ok = await confirmDialog({
    title: '重新分析本场考试数据？',
    message: '会重算成绩与统计指标，指标计算完成后才对外开放',
    danger: false
  })
  if (!ok) return
  try {
    const res = await analyzeArrange(arrangeId)
    toast.success(`分析完成（${res.analysisTime}）`)
    loadArrange()
  } catch { /* 拦截器已提示 */ }
}

const doUrge = async () => {
  const ids = Array.from(selectedIds.value)
  const ok = await confirmDialog({
    title: `确认催促 ${ids.length} 位考生？`,
    message: '催促通过平台通知通道下发',
    danger: false
  })
  if (!ok) return
  try {
    const res = await urgeArrangeStudents(arrangeId, 'exam', ids)
    toast.success(`已催促 ${res.sentCount} 人`)
  } catch { /* 拦截器已提示 */ }
}

const openLink = async () => {
  try {
    const res = await getArrangeLink(arrangeId)
    await navigator.clipboard.writeText(res.linkUrl).catch(() => undefined)
    toast.success('考试链接已复制到剪贴板')
  } catch { /* 拦截器已提示 */ }
}

const doPublish = async () => {
  const ok = await confirmDialog({
    title: '确认发布该考试？',
    message: '发布后试卷结构锁定，会冻结一份试卷快照',
    danger: false
  })
  if (!ok) return
  try {
    await publishArrange(arrangeId)
    toast.success('考试已发布')
    loadArrange()
  } catch { /* 拦截器已提示 */ }
}

const doEnd = async () => {
  const ok = await confirmDialog({ title: '确认结束该考试？', message: '结束后学员不能再进入', danger: true })
  if (!ok) return
  try {
    await endArrange(arrangeId)
    toast.success('考试已结束')
    loadArrange()
  } catch { /* 拦截器已提示 */ }
}

const goBack = () => router.push('/exam/exam-mgmt')

const onColumnsSaved = async () => {
  showColumns.value = false
  try {
    const res = await getStudentColumns()
    columnSetting.value = (res.columns || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch { /* 拦截器已提示 */ }
}

const openExportMenu = (event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  exportMenu.visible = true
  exportMenu.x = rect.right - 150
  exportMenu.y = rect.bottom + 4
}

/** API-27 导出考生数据：仅最高成绩 / 所有成绩 / 学员答卷。 */
const doExport = async (type: 'highest' | 'all' | 'answer') => {
  exportMenu.visible = false
  try {
    await exportArrangeStudents(arrangeId, type)
    toast.success('导出已开始下载')
  } catch {
    toast.error('导出失败，请重试')
  }
}

/** 跳答卷详情页。 */
const openResult = (row: ArrangeStudentItem) => {
  if (!row.currentAttemptId) return
  router.push(`/exam/result?ueId=${row.currentAttemptId}`)
}

/**
 * 筛选区的部门树与岗位候选。
 *
 * <p>两者都只是筛选项的来源，取不到时静默降级为空列表（选不到筛选项也不该刷错误提示），
 * 不阻断列表主流程。
 */
const loadFilterOptions = async () => {
  try {
    const res = await getArrangeDepartments()
    // 后端按 deptPath 排序不保证父在子前，这里自己按 path 升序，保证建树时能拿到父节点
    departments.value = (res.list || []).slice().sort((a, b) => (a.deptPath || '').localeCompare(b.deptPath || ''))
  } catch { /* 拦截器已提示 */ }
  try {
    const res = await getArrangePositions()
    positionOptions.value = (res.list || []).map(p => p.key).filter(Boolean)
  } catch { /* 拦截器已提示 */ }
}

onMounted(async () => {
  loadArrange()
  reload(1)
  onColumnsSaved()
  loadFilterOptions()
})
</script>

<style scoped lang="scss">
/*
 * 详情页根容器（2026-11-13 改为自然高度）。
 *
 * 原先 `height: 100%` + `min-height: 0` 把它锁在父容器高度内，
 * 于是内部 flex 链上的表格只能被压缩或自己开滚动条。
 * 改成高度由内容决定后，页面自然变长，由 `.exam-content` 统一纵向滚动 ——
 * 这才是「整个页面可滚动」的效果。
 */
.detail-page {
  display: flex;
  flex-direction: column;
  padding: 12px 16px 0;
}
.detail-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
  .back-btn { width: 28px; height: 28px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper); font-size: 18px; color: var(--color-ink-2); cursor: pointer; }
  .exam-name { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-ink); display: flex; align-items: center; gap: 8px; }
  .status-tag { padding: 1px 8px; border-radius: 3px; font-size: 11px; font-weight: 400; background: var(--color-paper-2); color: var(--color-muted); }
  .status-tag.s2 { background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper)); border: 1px solid color-mix(in oklab, var(--color-success) 40%, var(--color-paper)); color: var(--color-success); }
  .status-tag.s3 { background: var(--color-paper-2); border: 1px solid var(--color-rule); color: var(--color-muted); }
  .status-tag.s0 { background: color-mix(in oklab, var(--color-warning) 16%, var(--color-paper)); border: 1px solid color-mix(in oklab, var(--color-warning) 45%, var(--color-paper)); color: color-mix(in oklab, var(--color-warning) 60%, var(--color-ink)); }
  .header-actions { margin-left: auto; display: flex; gap: 10px; }
}

/*
 * ===== 基本信息（F6）=====
 * 尺寸全部来自 `原平台-考生列表表头.png` 逐像素实测（该图 1:1 CSS px）：
 * 卡片 x196..1873、标题行 y147..195（分隔线 #e9e9e9）、正文区 y196..403，
 * 内容左边界 x220 ⇒ 卡片内边距 24。
 * 行距 34px（实测 ink 基线 225/259/293/327/363）。
 * 右列标签 x972 ⇒ 距卡片左 776px，行宽 776 的一半略少，按 50% 两列平分更稳。
 */
.basic-info {
  background: var(--color-paper);
  border-radius: 4px;
  /* 卡片之间靠留白分隔（页面其余部分用 #f5f5f5 底），与实测一致 */
  margin-bottom: 12px;
  /* 内容不因内部表格滚动而被压扁；详情页是纵向 flex 容器 */
  flex: none;
}

/* 标题条：实测 ink y165..176（14px），下压一条 #e9e9e9 分隔线 */
.bi-title {
  padding: 14px 24px;
  border-bottom: 1px solid var(--color-rule);
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--color-ink);
}

/* 正文两列：左列 5 行、右列 3 行，各自独立，不互相撑高 */
.bi-body {
  display: flex;
  gap: 0;
  padding: 18px 24px 20px;
}

.bi-col {
  flex: 1 1 50%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 行高 34px（实测行距就是 34，即 22px 行盒 + 12px 间隙） */
.bi-row {
  display: flex;
  align-items: baseline;
  gap: 0;
  min-height: 34px;
  font-size: 14px;
  line-height: 22px;
}

/* 标签实测 #8c8c8c；冒号用全角写在模板里，不用 ::after 拼，方便校对文案 */
.bi-label {
  flex: none;
  color: var(--color-muted);
  white-space: nowrap;
}

/* 值实测 #262626，可换行（试卷名/时间可能很长） */
.bi-value {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-ink);
  word-break: break-all;
}

/*
 * 状态徽标：实测底 #E6EEFF、字 #436BFF、圆角 2px、高 20px（与学员端强调色一致）。
 * 复用页头 .status-tag 的语义色阶，但这里是深色底内联块，不能直接用那套描边样式。
 */
.bi-status {
  flex: none;
  padding: 0 8px;
  border-radius: 2px;
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
  font-size: 12px;
  line-height: 20px;

  /* 已结束/未发布按同结构降级为中性色，避免三个状态都是蓝色无法区分 */
  &.s0 { background: color-mix(in oklab, var(--color-warning) 16%, var(--color-paper)); color: color-mix(in oklab, var(--color-warning) 60%, var(--color-ink)); }
  &.s3 { background: var(--color-paper-2); color: var(--color-muted); }
}

/* 使用试卷：试卷名 + 可选「保密」徽标同行 */
.bi-paper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.bi-paper-name {
  color: var(--color-ink);
  word-break: break-all;
}

/* 保密徽标：实测底 #FFEFD9、字 #FA8C16、圆角 2px、高 20px */
.bi-tag-secrecy {
  flex: none;
  padding: 0 6px;
  border-radius: 2px;
  background: color-mix(in oklab, var(--color-warning) 20%, var(--color-paper));
  color: var(--color-warning);
  font-size: 12px;
  line-height: 20px;
}
.tabs {
  display: flex; gap: 4px; border-bottom: 1px solid var(--color-rule); margin-bottom: 12px;
  .tab {
    padding: 9px 18px; border: none; background: none; font-size: 14px; color: var(--color-ink-2); cursor: pointer;
    border-bottom: 2px solid transparent;
    &.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 500; }
  }
}
/*
 * 列表卡片（2026-11-13）。
 *
 * 高度由内容决定：表格按「每页条数 × 行高」定高，卡片随之变长，
 * 整页由 `.exam-content` 的滚动条承载。**不在这里开内层滚动** ——
 * 内层滚动会让分页条被推出视野、鼠标滚轮还容易卡在两个滚动区之间。
 */
.list-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 0 12px;
}
.toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; .export-btn { margin-left: auto; } }
.filter-row {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  // 与题库管理页一致：EP 下拉根节点必须定宽，否则块级元素会各占一行
  .filter-select { width: 130px; flex: 0 0 130px; font-size: 12px; color: var(--color-ink-2); }
  .filter-search { flex: 1 1 160px; min-width: 160px; max-width: 260px; font-size: 12px; }
  // 部门 cascader 与日期选择器比普通下拉宽：path 很长、日期要显完整
  .filter-cascader { width: 190px; flex: 0 0 190px; font-size: 12px; }
  .filter-date { width: 180px; flex: 0 0 180px; font-size: 12px; }
  .filter-submit { flex: none; }
}
/*
 * 表格容器（2026-11-13 第四次修，用户指正）。
 *
 * **我犯的错**：之前用 `min-height: calc(表头 + 行高 × 每页条数)` 强行撑高。
 * 选「100 条/页」而实际只有 8 条数据时，容器被撑到 5000+ px，下方大片空白。
 * 那是把「保底可见」做成了「制造空白」，反而不如不设。
 *
 * **现在**：高度交给 `el-table` 的 `max-height`（模板上已设）。
 *   - 内容超过上限 → 内部纵向滚动、表头固定（EP 原生）
 *   - 数据少 → 按实际行数收起，不留空白
 * 容器本身只负责横向滚动与尺寸约束，**不设任何高度下限**。
 */
.table-wrap {
  flex: 1 1 auto;
  overflow: auto;
  min-width: 0;

  /*
   * `max-width: none` 是必要的（2026-11-13 实测）。
   *
   * Element Plus 给 `.el-table` 设了 `max-width: 100%`。26 列的固定列宽合计约 2834px，
   * 被这条 max-width 压回容器宽后，el-table 会把列压扁、内部滚动条不出现，
   * 而 `fixed="right"` 的固定列是按内部滚动容器定位的，于是操作列和列设置齿轮
   * 一起跑到视口外点不到。解除这条限制后 el-table 才会按真实列宽内部横向滚动。
   */
  :deep(.el-table) {
    max-width: none;
  }
}
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--color-paper-2); vertical-align: middle; }
th { background: var(--color-paper-2); color: var(--color-muted); font-weight: 500; white-space: nowrap; }
tr:hover td { background: var(--color-accent-wash); }
tr.checked td { background: var(--color-accent-wash); }
.check-col { width: 36px; text-align: center; }
/*
 * 姓名/账号/部门/岗位这几列（colClass 返回空串的那几个）原先没有 nowrap，
 * 列宽只有 110px，遇到长姓名（实测 ABDURAXMONOV AKMALJON）会被逐字折成
 * 3~4 行，把整行撑得很高、表格像被揉过一样。
 *
 * 统一给单元格加 nowrap + 省略号：列宽固定，超长就截断并靠 tooltip / 拖动列宽看全。
 * 这是表格列的常规做法，也符合原平台的观感（原平台同样是单行显示）。
 */
/*
 * 单元格 nowrap（2026-11-13 修正）。
 *
 * 必须挂 `.cell`（el-table 真正承载文字的 div）并加 `:deep()`：
 * 只写 `.el-table__cell` 会被 Element Plus 自己的 `.el-table .cell { white-space: normal }`
 * 覆盖（实测 cellWhiteSpace 仍是 normal，长姓名照样折 2~3 行、行高 86px）。
 * `:deep()` 提高优先级，同时 `.cell` 才是文字所在的元素。
 */
:deep(.el-table .cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-time { min-width: 150px; white-space: nowrap; color: var(--color-muted); }
.col-sm { min-width: 80px; white-space: nowrap; }
.col-op { min-width: 110px; white-space: nowrap; }

/* 「操作」表头：文字在左，齿轮贴右侧（原平台 last-column-space-right 布局） */
.op-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
.col-gear {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; padding: 0; border: none; border-radius: 4px;
  background: transparent; color: var(--color-muted); cursor: pointer; font-size: 14px;
  /* 过渡只列具体属性（AGENTS §4）；获焦环由全局层提供，不重复实现 */
  transition: color 0.2s ease, background-color 0.2s ease;
  &:hover { color: var(--color-accent); background: var(--color-accent-wash); }
}
.pass-tag { padding: 1px 6px; border-radius: 3px; font-size: 11px; }
.pass-tag.p1 { background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper)); color: var(--color-success); border: 1px solid color-mix(in oklab, var(--color-success) 40%, var(--color-paper)); }
.pass-tag.p0 { background: color-mix(in oklab, var(--color-error) 10%, var(--color-paper)); color: var(--color-error); border: 1px solid color-mix(in oklab, var(--color-error) 40%, var(--color-paper)); }
.pass-tag.p2 { background: var(--color-paper-2); color: var(--color-muted); border: 1px solid var(--color-rule); }
.op-link { color: var(--color-accent); cursor: pointer; &:hover { text-decoration: underline; } }
.op-muted { color: var(--color-rule-2); }

/* 「答卷 | 更多∨」并排；两个文字链之间留与原平台相近的间距 */
.op-links { display: flex; align-items: center; gap: 8px; }
.more-trigger { display: inline-flex; align-items: center; gap: 2px; }
.more-trigger .caret { font-size: 12px; }
.dropdown-mask { position: fixed; inset: 0; z-index: 2999; }
.float-menu {
  position: fixed; z-index: 3000; min-width: 150px; background: var(--color-paper);
  border: 1px solid var(--color-rule); border-radius: 6px; box-shadow: 0 6px 20px var(--shadow-card); padding: 4px 0;
  .menu-item {
    padding: 8px 14px; font-size: 13px; color: var(--color-ink-2); cursor: pointer; white-space: nowrap;
    &:hover { background: var(--color-accent-wash); color: var(--color-accent); }
    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
  }
}
.empty-cell { text-align: center; color: var(--color-muted); padding: 48px 0; }
.pagination {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--color-muted);
  button { padding: 4px 10px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper); cursor: pointer; &:disabled { opacity: .5; } }
}
.placeholder { align-items: center; justify-content: center; color: var(--color-muted); .ph-title { font-size: 15px; color: var(--color-ink-2); margin: 0 0 6px; } .ph-desc { font-size: 13px; margin: 0; } }
.btn {
  padding: 7px 16px; border: 1px solid var(--color-rule-2); border-radius: 4px; background: var(--color-paper);
  font-size: 13px; color: var(--color-ink-2); cursor: pointer;
  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
  &:disabled { opacity: .55; cursor: not-allowed; }
}
</style>
