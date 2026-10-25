<template>
  <div class="theme-settings">
    <div class="settings-body">
    <!-- 左侧快速导航 -->
    <aside class="quick-nav">
      <div class="nav-card">
        <div class="nav-title">快速导航</div>
        <a
          v-for="sec in sections"
          :key="sec.id"
          class="nav-item"
          :class="{ active: activeSection === sec.id }"
          role="button"
          tabindex="0"
          @keydown.enter.prevent="scrollToSection(sec.id)"
          @click="scrollToSection(sec.id)"
        >{{ sec.label }}</a>
      </div>
    </aside>

    <!-- 右侧表单区（五分区共用一个表单状态，整体保存） -->
    <div ref="formScroll" class="form-area" @scroll="onScroll">
      <!-- 01 基本信息 -->
      <section id="sec-basic" class="form-section">
        <h3 class="section-title">基本信息</h3>
        <div class="form-item">
          <label class="form-label"><span class="required">*</span>主题名称</label>
          <div class="name-row">
            <el-input v-model="form.basic.themeName" maxlength="50" show-word-limit placeholder="请输入主题名称" />
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">主题描述</label>
          <div class="desc-wrap">
            <el-input
              v-model="form.basic.themeDesc"
              type="textarea"
              maxlength="100"
              show-word-limit
              placeholder="请输入主题描述"
            />
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">主题负责人</label>
          <div class="owner-block">
            <p class="owner-hint">设置主题负责人，负责人可以对项目进行管理与维护</p>
            <div class="owner-row">
              <span class="owner-set">已设置 1 位负责人</span>
              <span class="owner-tag">管理员</span>
            </div>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">计划开始时间</label>
          <el-date-picker
            v-model="planStart"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm"
            placeholder="计划开始时间"
            class="half"
          />
        </div>
        <div class="form-item">
          <label class="form-label">计划结束时间</label>
          <el-date-picker
            v-model="planEnd"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm"
            placeholder="计划结束时间"
            class="half"
          />
        </div>

        <div class="fold-panel">
          <div class="fold-head" role="button" tabindex="0" @keydown.enter.prevent="fold.planTime = !fold.planTime" @click="fold.planTime = !fold.planTime">
            <span>计划时间说明</span>
            <span class="fold-arrow" :class="{ open: fold.planTime }" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
          </div>
          <div v-if="fold.planTime" class="fold-body">
            计划时间仅用于展示训练计划周期，不限制学员实际练习时间；不填写则表示不设置计划周期。
          </div>
        </div>
        <div class="fold-panel">
          <div class="fold-head" role="button" tabindex="0" @keydown.enter.prevent="fold.ownerPerm = !fold.ownerPerm" @click="fold.ownerPerm = !fold.ownerPerm">
            <span>负责人权限说明</span>
            <span class="fold-arrow" :class="{ open: fold.ownerPerm }" aria-hidden="true"><el-icon><ArrowDown /></el-icon></span>
          </div>
          <div v-if="fold.ownerPerm" class="fold-body">
            主题负责人可以查看主题数据、修改主题设置、管理场景单元与学员；负责人变更请前往人员管理功能（建设中）。
          </div>
        </div>
      </section>

      <!-- 02 访问控制 -->
      <section id="sec-access" class="form-section">
        <h3 class="section-title">访问控制</h3>

        <div class="sub-block">
          <div class="sub-title">演练次数配置</div>
          <p class="sub-desc">设置主题的总演练次数和单个学员的演练机会</p>
          <div class="form-item">
            <div class="label-row">
              <label class="form-label"><span class="required">*</span>总演练次数</label>
              <span class="capacity-note">剩余企业容量：{{ remainingCapacity }} 次</span>
            </div>
            <div class="input-with-unit">
              <el-input-number v-model="form.access.totalDrillCount" :min="1" :controls="false" />
              <span class="unit">次</span>
            </div>
            <p class="field-hint"><span aria-hidden="true">ℹ</span> 学员在本主题内可练习的总演练次数</p>
          </div>
          <div class="form-item">
            <label class="form-label"><span class="required">*</span>单个学员每个场景演练机会</label>
            <div class="radio-line">
              <el-radio-group v-model="perSceneUnlimited">
                <el-radio :value="true">不限</el-radio>
                <el-radio :value="false">限制最多</el-radio>
              </el-radio-group>
              <el-input-number
                v-model="perSceneLimitInput"
                :min="1"
                :controls="false"
                :disabled="perSceneUnlimited"
              />
              <span class="unit">次</span>
            </div>
          </div>
          <div class="fold-panel">
            <div class="fold-head" role="button" tabindex="0" @keydown.enter.prevent="fold.accessRule = !fold.accessRule" @click="fold.accessRule = !fold.accessRule">
              <span class="link-text">查看规则详情</span>
              <span class="fold-arrow" :class="{ open: fold.accessRule }" aria-hidden="true"><el-icon><CaretTop /></el-icon></span>
            </div>
            <div v-if="fold.accessRule" class="fold-body">
              <p>• 限制仅针对单个学员在每个独立场景的次数。</p>
              <p>• 例如限制 5 次，学员可在场景 A 练习 5 次、场景 B 也可练习 5 次（互不影响）。</p>
              <p>• 所有练习均消耗主题的总演练次数，总次数耗尽则全体停练。</p>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title">学员加入方式</div>
          <p class="sub-desc">管理员指派始终可用，可开启完全公开允许其他学员加入</p>
          <div class="select-cards">
            <div class="select-card" :class="{ selected: form.access.joinMode === 1 }" role="button" tabindex="0" @keydown.enter.prevent="form.access.joinMode = 1" @click="form.access.joinMode = 1">
              <span class="card-check" aria-hidden="true">{{ form.access.joinMode === 1 ? '☑' : '☐' }}</span>
              <div>
                <div class="select-card-title">管理员指派</div>
                <div class="select-card-desc">管理员手动将学员添加到此主题，学员在自己的界面直接可见</div>
              </div>
            </div>
            <div class="select-card" :class="{ selected: form.access.joinMode === 2 }" role="button" tabindex="0" @keydown.enter.prevent="form.access.joinMode = 2" @click="form.access.joinMode = 2">
              <span class="card-check" aria-hidden="true">{{ form.access.joinMode === 2 ? '☑' : '☐' }}</span>
              <div>
                <div class="select-card-title">完全公开</div>
                <div class="select-card-desc">所有学员无需申请即可直接参加此主题的练习</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title-row">
            <div>
              <div class="sub-title">支持游客访问</div>
              <p class="sub-desc">开启后分享链接支持游客扫码进入，数据单独统计</p>
            </div>
            <el-switch v-model="form.access.guestAccessEnabled" />
          </div>
          <a class="blue-link" role="button" tabindex="0" @keydown.enter.prevent="comingSoon('功能建设中')" @click="comingSoon('功能建设中')">配置游客信息收集 →</a>
        </div>
      </section>

      <!-- 03 训练策略 -->
      <section id="sec-strategy" class="form-section">
        <h3 class="section-title">训练策略</h3>

        <div class="sub-block">
          <div class="sub-title">AI 响应模式</div>
          <p class="sub-desc">控制 AI 角色的思考深度与回复速度，调整后仅对新发起的练习生效，进行中的练习不受影响。</p>
          <div class="select-cards">
            <div class="select-card" :class="{ selected: form.strategy.aiResponseMode === 1 }" role="button" tabindex="0" @keydown.enter.prevent="form.strategy.aiResponseMode = 1" @click="form.strategy.aiResponseMode = 1">
              <span class="radio-dot" :class="{ on: form.strategy.aiResponseMode === 1 }"></span>
              <div class="flex-1">
                <div class="select-card-title">专家模式 <span v-if="form.strategy.aiResponseMode === 1" class="default-tag">默认</span></div>
                <div class="select-card-desc">深度思考，侧重对话质量与评估专业度</div>
              </div>
            </div>
            <div class="select-card" :class="{ selected: form.strategy.aiResponseMode === 2 }" role="button" tabindex="0" @keydown.enter.prevent="form.strategy.aiResponseMode = 2" @click="form.strategy.aiResponseMode = 2">
              <span class="radio-dot" :class="{ on: form.strategy.aiResponseMode === 2 }"></span>
              <div class="flex-1">
                <div class="select-card-title">快速模式</div>
                <div class="select-card-desc">快速响应，均衡专业度与响应速度，适合日常高频练习</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title-row">
            <div>
              <div class="sub-title">AI 演练模式</div>
              <p class="sub-desc">开启需要的演练模式，可同时启用多种；学员将按顺序依次完成。</p>
            </div>
            <span class="enabled-pill">已启用 {{ enabledDrillModes }} 种</span>
          </div>

          <!-- 训练模式 -->
          <div class="mode-card" :class="{ on: form.strategy.trainingModeEnabled }">
            <div class="mode-head">
              <div>
                <div class="mode-title purple"><span aria-hidden="true">●</span> 训练模式</div>
                <p class="mode-desc">AI 专注角色扮演，每轮对话结束后根据开启的辅助能力给予反馈，帮助学员在真实场景中持续提升</p>
              </div>
              <el-switch v-model="form.strategy.trainingModeEnabled" />
            </div>
            <div v-if="form.strategy.trainingModeEnabled" class="ai-ability">
              <div class="ability-left">
                <div class="sub-title">AI 辅助能力</div>
                <p class="sub-desc">练习中每轮对话后实时呈现，帮助学员即时改进</p>
                <div class="ability-card" :class="{ selected: true }">
                  <label class="check-line">
                    <el-checkbox model-value disabled />
                    <span class="ability-name">教练点评 <span class="must-tag">必选</span></span>
                  </label>
                  <p class="ability-desc">对话中 AI 实时分析学员回答，在表现突出、应对欠佳或触犯禁忌等关键时刻即时表扬或纠偏（按需触发，非每轮出现）</p>
                </div>
                <div
                  class="ability-card"
                  :class="{ selected: form.strategy.suggestionEnabled }"
                  role="button"
                  tabindex="0"
                  @keydown.enter.prevent="form.strategy.suggestionEnabled = !form.strategy.suggestionEnabled"
                  @click="form.strategy.suggestionEnabled = !form.strategy.suggestionEnabled"
                >
                  <label class="check-line" @click.stop>
                    <el-checkbox
                      :model-value="form.strategy.suggestionEnabled"
                      @change="form.strategy.suggestionEnabled = Boolean($event)"
                    />
                    <span class="ability-name">应对建议</span>
                  </label>
                  <p class="ability-desc">AI 陪练发言后、学员应答前，学员可点击「生成建议」按需获取应对分析与示范话术</p>
                </div>
              </div>
              <!-- 学员端实时效果示例（静态 mockup，跟随开关联动） -->
              <div class="ability-right">
                <div class="chat-mockup">
                  <div class="chat-title">学员端实时效果示例 · 跟随左侧开关联动</div>
                  <div class="bubble student">我们这款光猫稳定性业内领先，您放心买就行。</div>
                  <div class="bubble coach">
                    <div class="coach-label">教练点评</div>
                    主动报卖点不错，但语气略急——先共情顾虑、再推进会更稳。
                  </div>
                  <div class="bubble trainer">
                    <div class="trainer-label">AI 陪练</div>
                    稳定性谁都会说，我家这个也没说不稳定，凭啥换你们的？
                    <div class="suggest-btn">✦ 生成建议</div>
                  </div>
                  <div class="chat-input-bar">点击说话</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 考核模式（含防作弊，只展示不做逻辑） -->
          <div class="mode-card" :class="{ on: form.strategy.assessmentModeEnabled }">
            <div class="mode-head">
              <div>
                <div class="mode-title gray"><span aria-hidden="true">●</span> 考核模式</div>
                <p class="mode-desc">全程无 AI 辅助，还原真实客户，用于正式评估</p>
              </div>
              <el-switch v-model="form.strategy.assessmentModeEnabled" />
            </div>
            <div v-if="form.strategy.assessmentModeEnabled" class="anti-cheat">
              <div class="sub-title">防作弊</div>
              <div class="form-item">
                <div class="label-row">
                  <label class="form-label">人脸识别</label>
                  <el-switch v-model="form.strategy.antiCheat.faceCheckEnabled" size="small" />
                </div>
                <el-radio-group
                  v-if="form.strategy.antiCheat.faceCheckEnabled"
                  v-model="form.strategy.antiCheat.faceCheckStage"
                  class="radio-line"
                >
                  <el-radio value="before">考核前检测</el-radio>
                  <el-radio value="ongoing">考核中持续检测</el-radio>
                </el-radio-group>
              </div>
              <div class="form-item">
                <label class="form-label">切屏检测</label>
                <div class="radio-line">
                  <el-radio-group v-model="form.strategy.antiCheat.screenSwitchMode">
                    <el-radio value="forbid">不允许切屏</el-radio>
                    <el-radio value="allow">允许</el-radio>
                  </el-radio-group>
                  <el-input-number
                    v-model="form.strategy.antiCheat.screenSwitchLimit"
                    :min="0"
                    :controls="false"
                    :disabled="form.strategy.antiCheat.screenSwitchMode !== 'allow'"
                  />
                  <span class="unit">次</span>
                </div>
              </div>
              <p class="field-hint">防作弊设置仅作展示，暂不参与考核逻辑</p>
            </div>
          </div>

          <div class="fold-panel">
            <div class="fold-head" role="button" tabindex="0" @keydown.enter.prevent="fold.drillRule = !fold.drillRule" @click="fold.drillRule = !fold.drillRule">
              <span class="link-text">查看演练模式配置说明</span>
              <span class="fold-arrow" :class="{ open: fold.drillRule }" aria-hidden="true"><el-icon><CaretTop /></el-icon></span>
            </div>
            <div v-if="fold.drillRule" class="fold-body">
              <p>• 成绩计算：考核模式的练习结果用于计算场景及主题的通过结果；训练模式仅作练习反馈。</p>
              <p>• 演练模式开关：两种模式可同时启用，学员将按顺序依次完成训练与考核。</p>
              <p>• AI 辅助能力与防作弊检测仅在对应模式下生效。</p>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title">学员练习方式</div>
          <p class="sub-desc">勾选后学员可在开始练习时选择对应方式，支持同时开启多种，至少保留一种。</p>
          <div class="select-cards three">
            <div
              v-for="pm in practiceMethodOptions"
              :key="pm.value"
              class="select-card"
              :class="{ selected: form.strategy.practiceMethods.includes(pm.value) }"
              role="button"
              tabindex="0"
              @keydown.enter.prevent="togglePracticeMethod(pm.value)"
              @click="togglePracticeMethod(pm.value)"
            >
              <span class="card-check" aria-hidden="true">{{ form.strategy.practiceMethods.includes(pm.value) ? '☑' : '☐' }}</span>
              <div>
                <div class="select-card-title">{{ pm.label }}</div>
                <div class="select-card-desc">{{ pm.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title">主题难度</div>
          <p class="sub-desc">设置本主题的整体难度等级，将展示在主题头部。</p>
          <div class="difficulty-row">
            <el-button
              v-for="d in [1, 2, 3]"
              :key="d"
              class="difficulty-btn"
              :class="{ selected: form.strategy.difficulty === d }"
              @click="form.strategy.difficulty = d"
              ><span aria-hidden="true">{{ difficultyStars(d) }}</span> {{ ACT_DIFFICULTY_TEXT[d] }}</el-button>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title-row">
            <div>
              <div class="sub-title">允许学员自定义难度</div>
              <p class="sub-desc">开启后学员在自定义练习和随机练习时可自行选择难度等级</p>
            </div>
            <el-switch v-model="form.strategy.allowCustomDifficulty" />
          </div>
        </div>
      </section>

      <!-- 04 通过标准 -->
      <section id="sec-pass" class="form-section">
        <h3 class="section-title">通过标准</h3>
        <div class="info-banner">基于 <b>训练模式</b> 的练习达标结果，计算场景及主题的通过结果。</div>

        <div class="sub-block">
          <div class="sub-title">场景通过标准</div>
          <p class="sub-desc">学员达标达到设定次数，即视为通过该场景。达标次数可设 1 ~ N 次。</p>
          <div class="select-cards">
            <div class="select-card" :class="{ selected: form.passStandard.scenePassType === 1 }" role="button" tabindex="0" @keydown.enter.prevent="form.passStandard.scenePassType = 1" @click="form.passStandard.scenePassType = 1">
              <span class="radio-dot" :class="{ on: form.passStandard.scenePassType === 1 }"></span>
              <div class="flex-1">
                <div class="select-card-title">累计达标</div>
                <div class="select-card-desc">累计多次练习的达标次数，不要求连续</div>
                <div v-if="form.passStandard.scenePassType === 1" class="pass-count-row" @click.stop>
                  累计达标
                  <el-input-number
                    v-model="form.passStandard.scenePassCount"
                    :min="1"
                    :controls="false"
                  />
                  次，即通过该场景
                </div>
              </div>
            </div>
            <div class="select-card" :class="{ selected: form.passStandard.scenePassType === 2 }" role="button" tabindex="0" @keydown.enter.prevent="form.passStandard.scenePassType = 2" @click="form.passStandard.scenePassType = 2">
              <span class="radio-dot" :class="{ on: form.passStandard.scenePassType === 2 }"></span>
              <div class="flex-1">
                <div class="select-card-title">连续达标</div>
                <div class="select-card-desc">连续多次练习均达标，中途未达标则重新计数</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <div class="sub-title">主题通过标准</div>
          <div class="gray-info-box">学员需通过本主题下的<b>全部场景单元</b>（当前共 {{ contentOverview.scenarioUnitCount }} 个），才算通过本主题。</div>
        </div>
      </section>

      <!-- 05 内容设计 -->
      <section id="sec-content" class="form-section">
        <h3 class="section-title">内容设计</h3>
        <div class="sub-block">
          <div class="sub-title">当前内容概览</div>
          <p class="sub-desc">场景单元、客户画像、冰山模型、评估标准等内容通过 AI 设计助手进行配置和优化</p>
          <div class="overview-grid">
            <div class="overview-card">
              <div class="overview-label">场景单元</div>
              <div class="overview-value">{{ contentOverview.scenarioUnitCount }} <span class="overview-unit">个</span></div>
            </div>
            <div class="overview-card">
              <div class="overview-label">客户画像</div>
              <div class="overview-value">{{ contentOverview.customerProfileCount }} <span class="overview-unit">类</span></div>
            </div>
            <div class="overview-card">
              <div class="overview-label">冰山模型要素</div>
              <div class="overview-value">{{ contentOverview.icebergElementCount }} <span class="overview-unit">项</span></div>
            </div>
            <div class="overview-card">
              <div class="overview-label">评估维度</div>
              <div class="overview-value">{{ contentOverview.evaluationDimensionCount }} <span class="overview-unit">个</span></div>
            </div>
          </div>
          <el-button class="ai-design-btn" @click="goAssistant"><span aria-hidden="true">⚡</span> 进入 AI 设计助手 调整内容</el-button>
          <p class="ai-design-hint">在 AI 助手中可以调整场景设计、客户画像、冰山模型、评估标准和练习限制</p>
        </div>
      </section>
    </div>
    </div>

    <!-- 底部共用操作条 -->
    <div class="settings-footer">
      <el-button class="btn-cancel" @click="reload">取消</el-button>
      <el-button class="btn-save" :disabled="saving || themeStatus === 5" @click="onSave">{{ saving ? '保存中…' : '保存设置' }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, CaretTop } from '@element-plus/icons-vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getThemeSettings, saveThemeSettings } from '@/api/actTheme'
import { ACT_DIFFICULTY_TEXT, difficultyStars } from '@/types/actTheme'
import type {
  ActAccessSetting,
  ActBasicSetting,
  ActContentOverview,
  ActPassStandardSetting,
  ActStrategySetting,
  ActThemeSettings
} from '@/types/actTheme'
import { comingSoon, showToast } from './ui'

const props = defineProps<{ themeId: string; themeStatus: number }>()
const emit = defineEmits<{ (e: 'saved'): void }>()

const router = useRouter()

/** FP-43：内容设计「进入 AI 设计助手」→ 携带该主题 ID 进入对话页 */
const goAssistant = () => {
  router.push(`/sparring/freesimulate/assistant/${props.themeId}`)
}

const saving = ref(false)
const remainingCapacity = ref(2)
const themeStatus = computed(() => props.themeStatus)

const form = reactive({
  basic: {
    themeName: '',
    themeDesc: null,
    ownerUserId: '',
    planStartTime: null,
    planEndTime: null
  } as ActBasicSetting,
  access: {
    totalDrillCount: 1,
    remainingEnterpriseCapacity: 0,
    perSceneLimit: null,
    joinMode: 1,
    guestAccessEnabled: false
  } as ActAccessSetting,
  strategy: {
    aiResponseMode: 1,
    trainingModeEnabled: true,
    assessmentModeEnabled: false,
    coachReviewEnabled: true,
    suggestionEnabled: false,
    practiceMethods: [] as string[],
    difficulty: 2,
    allowCustomDifficulty: true,
    antiCheat: { faceCheckEnabled: false, faceCheckStage: null, screenSwitchMode: 'forbid', screenSwitchLimit: 0 }
  } as ActStrategySetting,
  passStandard: { scenePassType: 1, scenePassCount: 1 } as ActPassStandardSetting
})
const contentOverview = ref<ActContentOverview>({
  scenarioUnitCount: 0,
  customerProfileCount: 0,
  icebergElementCount: 0,
  evaluationDimensionCount: 0
})

const planStart = ref('')
const planEnd = ref('')

const fold = reactive({ planTime: false, ownerPerm: false, accessRule: true, drillRule: true })

const sections = [
  { id: 'sec-basic', label: '01 基本信息' },
  { id: 'sec-access', label: '02 访问控制' },
  { id: 'sec-strategy', label: '03 训练策略' },
  { id: 'sec-pass', label: '04 通过标准' },
  { id: 'sec-content', label: '05 内容设计' }
]
const activeSection = ref('sec-basic')
const formScroll = ref<HTMLElement | null>(null)

const practiceMethodOptions = [
  { value: 'case', label: '案例练习', desc: '学员按照场景单元中定义好的实战案例进行练习' },
  { value: 'custom', label: '自定义练习', desc: '学员选择场景并自定义具体情境后开始练习' },
  { value: 'random', label: '随机练习', desc: '学员选择场景并由系统随机生成具体情境后开始练习' }
]

const enabledDrillModes = computed(
  () => (form.strategy.trainingModeEnabled ? 1 : 0) + (form.strategy.assessmentModeEnabled ? 1 : 0)
)

const perSceneUnlimited = computed({
  get: () => form.access.perSceneLimit == null,
  set: (v: boolean) => { form.access.perSceneLimit = v ? null : Math.max(1, perSceneLimitInput.value) }
})
const perSceneLimitInput = ref(1)

// ---------- 加载 / 重载 ----------

function applySettings(s: ActThemeSettings) {
  form.basic = { ...s.basic }
  form.access = { ...s.access }
  form.strategy = {
    ...s.strategy,
    practiceMethods: [...s.strategy.practiceMethods],
    antiCheat: { ...s.strategy.antiCheat }
  }
  form.passStandard = { ...s.passStandard }
  remainingCapacity.value = s.access.remainingEnterpriseCapacity
  contentOverview.value = { ...s.contentOverview }
  planStart.value = toLocalDateTime(s.basic.planStartTime)
  planEnd.value = toLocalDateTime(s.basic.planEndTime)
  if (s.access.perSceneLimit != null) perSceneLimitInput.value = s.access.perSceneLimit
}

async function reload() {
  const s = await getThemeSettings(props.themeId)
  applySettings(s)
}

defineExpose({ reload })

// ---------- 保存 ----------

async function onSave() {
  // 前端校验（后端兜底）
  const name = (form.basic.themeName || '').trim()
  if (!name) { showToast('请输入主题名称'); return }
  if (name.length > 50) { showToast('主题名称不能超过 50 字'); return }
  if (form.basic.themeDesc && form.basic.themeDesc.length > 100) { showToast('主题描述不能超过 100 字'); return }
  if (!form.access.totalDrillCount || form.access.totalDrillCount < 1) { showToast('总演练次数必须为至少 1 次'); return }
  if (!perSceneUnlimited.value && (!perSceneLimitInput.value || perSceneLimitInput.value < 1)) {
    showToast('单场景演练次数必须为至少 1 次'); return
  }
  if (!form.strategy.trainingModeEnabled && !form.strategy.assessmentModeEnabled) {
    showToast('至少启用一种演练模式'); return
  }
  if (!form.strategy.practiceMethods.length) { showToast('至少保留一种练习方式'); return }
  if (!form.passStandard.scenePassCount || form.passStandard.scenePassCount < 1) {
    showToast('达标次数必须为至少 1 次'); return
  }
  if (planStart.value && planEnd.value && planStart.value > planEnd.value) {
    showToast('计划开始时间不能晚于计划结束时间'); return
  }

  saving.value = true
  try {
    await saveThemeSettings(props.themeId, {
      basic: {
        themeName: name,
        themeDesc: form.basic.themeDesc,
        planStartTime: fromLocalDateTime(planStart.value),
        planEndTime: fromLocalDateTime(planEnd.value)
      },
      access: {
        totalDrillCount: form.access.totalDrillCount,
        perSceneLimit: perSceneUnlimited.value ? null : perSceneLimitInput.value,
        joinMode: form.access.joinMode,
        guestAccessEnabled: form.access.guestAccessEnabled
      },
      strategy: {
        ...form.strategy,
        // 训练模式开启时教练点评强制勾选
        coachReviewEnabled: form.strategy.trainingModeEnabled ? true : form.strategy.coachReviewEnabled
      },
      passStandard: { ...form.passStandard }
    })
    showToast('保存成功')
    emit('saved')
    await reload()
  } catch (e) {
    if (e instanceof Error && e.message) showToast(e.message)
  } finally {
    saving.value = false
  }
}

function togglePracticeMethod(value: string) {
  const idx = form.strategy.practiceMethods.indexOf(value)
  if (idx >= 0) form.strategy.practiceMethods.splice(idx, 1)
  else form.strategy.practiceMethods.push(value)
}

// ---------- 导航 ----------

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el && formScroll.value) {
    formScroll.value.scrollTo({ top: el.offsetTop - formScroll.value.offsetTop - 8, behavior: 'smooth' })
  }
  activeSection.value = id
}

function onScroll() {
  const container = formScroll.value
  if (!container) return
  const base = container.getBoundingClientRect().top + 60
  let current = sections[0]?.id ?? 'sec-basic'
  for (const sec of sections) {
    const el = document.getElementById(sec.id)
    if (el && el.getBoundingClientRect().top <= base) current = sec.id
  }
  activeSection.value = current
}

// ---------- 时间转换 ----------

function toLocalDateTime(time: string | null): string {
  if (!time) return ''
  return time.replace(' ', 'T').slice(0, 16)
}

function fromLocalDateTime(local: string): string | null {
  if (!local) return null
  return local.replace('T', ' ') + ':00'
}

// 初始化
reload().catch(() => { /* 加载失败由调用方处理 */ })
</script>

<style scoped lang="scss">
.theme-settings {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.settings-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.quick-nav {
  padding: 20px 0 0 20px;
  position: relative;
}

.nav-card {
  position: sticky;
  top: 0;
  width: 160px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 10px;

  .nav-title {
    font-size: 13px;
    color: #8a8f98;
    padding: 0 10px 10px;
    border-bottom: 1px solid #f2f3f5;
  }

  .nav-item {
    display: block;
    padding: 8px 10px;
    margin-top: 4px;
    border-radius: 6px;
    font-size: 14px;
    color: #4e5969;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    &:hover { background: #f5f7fa; }
    &.active { background: #e6f7ff; color: #1890ff; }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
  }
}

.form-area {
  flex: 1;
  min-width: 0;
  padding: 20px 24px 8px;
  overflow-y: auto;
  max-height: calc(100vh - 320px);
  min-height: 400px;
}

.form-section {
  padding-bottom: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
  margin: 12px 0 16px;

  &::before {
    content: '';
    width: 3px;
    height: 16px;
    background: #1890ff;
    border-radius: 2px;
    margin-right: 8px;
  }
}

.form-item {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1f2329;
  margin-bottom: 8px;

  .required { color: #e5484d; margin-right: 2px; }
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .capacity-note { font-size: 13px; color: #8a8f98; }
}

.form-input {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  outline: none;

  &:focus { border-color: #1890ff; }
  &.half { max-width: 280px; }
  &.narrow { max-width: 160px; }
  &.tiny { width: 72px; height: 30px; padding: 0 8px; }
  &:disabled { background: #f5f7fa; color: #a5a9b0; cursor: not-allowed; }
}

.name-row {
  position: relative;
  max-width: 420px;

  .char-counter {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    color: #bbb;
  }

  .form-input { padding-right: 56px; }
}

.desc-wrap {
  position: relative;
  max-width: 420px;

  .form-textarea {
    width: 100%;
    height: 88px;
    padding: 8px 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
    outline: none;
    resize: none;
    font-family: inherit;

    &:focus { border-color: #1890ff; }
  }

  .char-counter {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 13px;
    color: #bbb;
  }
}

.field-hint {
  font-size: 13px;
  color: #a5a9b0;
  margin: 6px 0 0;
}

.owner-block {
  .owner-hint { font-size: 13px; color: #8a8f98; margin: 0 0 8px; }

  .owner-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .owner-set { font-size: 14px; color: #4e5969; }

  .owner-tag {
    padding: 1px 10px;
    border-radius: 4px;
    font-size: 13px;
    color: #1890ff;
    background: #e6f7ff;
  }
}

// 折叠面板
.fold-panel {
  border: 1px solid #f0f1f3;
  border-radius: 6px;
  margin-top: 12px;
  overflow: hidden;

  .fold-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    font-size: 14px;
    color: #4e5969;
    background: #fafbfc;
    cursor: pointer;

    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }

    .link-text { color: #1890ff; }
    .fold-arrow { color: #bbb; transition: transform 0.2s; &.open { transform: rotate(180deg); } }
  }

  .fold-body {
    padding: 10px 14px;
    font-size: 13px;
    color: #8a8f98;
    line-height: 1.8;

    p { margin: 0; }
  }
}

.sub-block {
  margin-bottom: 20px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #f0f1f3;

  &:last-child { border-bottom: none; }
}

.sub-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.sub-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.sub-desc {
  font-size: 13px;
  color: #8a8f98;
  margin: 4px 0 12px;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;

  .unit { font-size: 14px; color: #4e5969; }
}

.radio-line {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .radio-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #4e5969;
    cursor: pointer;

    input[type='radio'] { accent-color: #1890ff; }
  }

  .unit { font-size: 14px; color: #4e5969; }
}

.select-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  &.three { grid-template-columns: repeat(3, 1fr); }
}

.select-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover { border-color: #a5d8ff; }
  &.selected { border-color: #1890ff; background: #f0f8ff; }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; }

  .card-check { font-size: 18px; color: #bbb; line-height: 1.4; }
  &.selected .card-check { color: #1890ff; }

  .radio-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid #dcdfe6;
    flex-shrink: 0;
    margin-top: 2px;

    &.on {
      border-color: #1890ff;
      border-width: 5px;
    }
  }

  .flex-1 { flex: 1; min-width: 0; }

  .select-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2329;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .select-card-desc {
    font-size: 13px;
    color: #8a8f98;
    line-height: 1.6;
  }

  .default-tag {
    padding: 0 6px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 400;
    color: #1890ff;
    background: #e6f7ff;
  }
}

.pass-count-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 14px;
  color: #4e5969;
}

.blue-link {
  display: inline-block;
  font-size: 14px;
  color: #1890ff;
  cursor: pointer;

  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; }
}

.enabled-pill {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 13px;
  color: #1890ff;
  background: #e6f7ff;
  white-space: nowrap;
}

.mode-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;

  &.on { border-color: #b7c9f5; }

  .mode-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .mode-title {
    font-size: 15px;
    font-weight: 600;

    &.purple { color: #6b5ce7; }
    &.gray { color: #646a73; }
  }

  .mode-desc {
    font-size: 13px;
    color: #8a8f98;
    line-height: 1.6;
    margin: 4px 0 0;
    max-width: 560px;
  }
}

.ai-ability {
  display: flex;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #eef0f3;

  .ability-left { flex: 1; min-width: 0; }
  .ability-right { width: 320px; flex-shrink: 0; }
}

.ability-card {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  transition: border-color 0.2s, background 0.2s;

  &.selected { border-color: #1890ff; background: #f7fbff; }
  &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; }

  .check-line {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    input[type='checkbox'] { accent-color: #1890ff; }
  }

  .ability-name {
    font-size: 14px;
    font-weight: 600;
    color: #1f2329;
  }

  .must-tag {
    padding: 0 6px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 400;
    color: #e8940c;
    background: #fff7e6;
  }

  .ability-desc {
    font-size: 13px;
    color: #8a8f98;
    line-height: 1.6;
    margin: 6px 0 0;
  }
}

.chat-mockup {
  background: #2b2f3a;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .chat-title {
    font-size: 12px;
    color: #9aa0ac;
    text-align: center;
  }

  .bubble {
    max-width: 92%;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;

    &.student {
      align-self: flex-end;
      background: #1890ff;
      color: #fff;
      border-bottom-right-radius: 2px;
    }

    &.coach {
      align-self: flex-start;
      background: #3d5a3d;
      color: #d6f5d6;
      border-bottom-left-radius: 2px;

      .coach-label { font-weight: 600; margin-bottom: 2px; color: #9be89b; }
    }

    &.trainer {
      align-self: flex-start;
      background: #3a3f4d;
      color: #e8eaf0;
      border-bottom-left-radius: 2px;

      .trainer-label { font-weight: 600; margin-bottom: 2px; color: #a5b4fc; }

      .suggest-btn {
        display: inline-block;
        margin-top: 8px;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 12px;
        color: #fff;
        background: #6b5ce7;
      }
    }
  }

  .chat-input-bar {
    margin-top: 2px;
    padding: 7px 12px;
    border-radius: 14px;
    background: #3a3f4d;
    color: #7a8090;
    font-size: 13px;
    text-align: center;
  }
}

.anti-cheat {
  margin-top: 14px;
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
}

.difficulty-row {
  display: flex;
  gap: 12px;
}

.difficulty-btn {
  padding: 8px 18px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  color: #4e5969;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;

  &:hover { border-color: #1890ff; color: #1890ff; }
  &.selected { border-color: #1890ff; color: #1890ff; background: #f0f8ff; font-weight: 600; }
}

.info-banner {
  padding: 10px 14px;
  border-radius: 6px;
  background: #f0edff;
  color: #4e5969;
  font-size: 14px;
  margin-bottom: 16px;

  b { color: #6b5ce7; }
}

.gray-info-box {
  padding: 10px 14px;
  border-radius: 6px;
  background: #f5f6f8;
  color: #4e5969;
  font-size: 14px;

  b { color: #1f2329; }
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.overview-card {
  background: #f5f6f8;
  border-radius: 8px;
  padding: 16px;

  .overview-label { font-size: 13px; color: #8a8f98; margin-bottom: 6px; }

  .overview-value {
    font-size: 24px;
    font-weight: 600;
    color: #1f2329;

    .overview-unit { font-size: 13px; font-weight: 400; color: #8a8f98; }
  }
}

.ai-design-btn {
  width: 100%;
  padding: 11px 0;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #4f6ef7, #6b5ce7);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.88; }
}

.ai-design-hint {
  text-align: center;
  font-size: 13px;
  color: #a5a9b0;
  margin: 10px 0 4px;
}

// 开关
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;

  input { display: none; }

  .slider {
    position: absolute;
    inset: 0;
    background: #dcdfe6;
    border-radius: 11px;
    transition: background 0.2s;
    cursor: pointer;

    &::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      left: 2px;
      top: 2px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  input:checked + .slider {
    background: #1890ff;

    &::before { transform: translateX(18px); }
  }

  &.small { width: 34px; height: 19px; .slider::before { width: 15px; height: 15px; } input:checked + .slider::before { transform: translateX(15px); } }
}

// 底部操作条
.settings-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 14px 24px;
  border-top: 1px solid #f0f1f3;

  button {
    padding: 8px 28px;
    border-radius: 6px;
    font-size: 15px;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, opacity 0.2s;
  }

  .btn-cancel {
    background: #fff;
    color: #4e5969;
    border: 1px solid #dcdfe6;

    &:hover { color: #1890ff; border-color: #1890ff; }
  }

  .btn-save {
    background: #1890ff;
    color: #fff;
    border: 1px solid #1890ff;

    &:hover:not(:disabled) { opacity: 0.85; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }
}
</style>
