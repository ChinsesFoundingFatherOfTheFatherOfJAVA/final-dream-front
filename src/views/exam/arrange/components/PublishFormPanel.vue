<template>
  <!-- F18 发布考试配置（新增/编辑共用）
       布局对齐原平台截图：左「基本信息」 + 右「通知设置」，下方「更多设置」两栏分组。
       已发布时按 F18.1 白名单：名称/重要考试/保密/分类/入场时间/优秀分数/说明/负责人/批阅人/通知可改；
       防作弊限制、学习任务限制、循环考试、通过分数、学员奖励等置灰。 -->
  <div class="publish-panel">
    <div class="main-grid">
      <!-- ============ 基本信息 ============ -->
      <section class="card basic-card">
        <p class="section-title">基本信息</p>

        <div class="field">
          <span class="label required">考试名称</span>
          <div class="input-wrap">
            <el-input v-model.trim="form.name" maxlength="1000" placeholder="请输入考试名称" />
            <em>{{ form.name.length }}/1000</em>
          </div>

          <div class="switch-line">
            <ToggleSwitch v-model="form.important" />
            <span>重要考试</span>
            <i class="help" title="标记后，考试列表会突出显示">?</i>
          </div>

          <div class="switch-line">
            <ToggleSwitch v-model="form.secrecy" />
            <span>是否保密</span>
            <i class="help" title="保密考试的考生范围由创建者决定">?</i>
          </div>
          <p class="hint">开启后，仅支持创建者、负责人及超级管理员等相关人员可查看和编辑，其他人不可见。</p>
        </div>

        <div class="field">
          <span class="label required">考试分类</span>
          <el-select v-model="form.catalogId">
            <el-option v-for="c in flatCatalogs" :key="c.id" :value="c.id" :label="'　'.repeat(c.level) + c.name" />
          </el-select>
        </div>

        <div class="field" :class="{ locked: published }">
          <span class="label">编号</span>
          <el-input v-model.trim="form.code" placeholder="请输入" :disabled="published" />
          <em v-if="published" class="lock-hint">已发布后不可改</em>
        </div>

        <div class="field">
          <span class="label required">使用试卷</span>
          <div class="user-box" :class="{ locked: published }" role="button"
               :tabindex="published ? -1 : 0" aria-label="选择试卷"
               @click="!published && openPaperPick()" @keydown.enter.prevent="!published && openPaperPick()">
            <span v-if="form.paperName" class="user-tag">{{ form.paperName }}</span>
            <span v-else class="placeholder">请选择试卷</span>
            <span v-if="!published" class="more-dots" role="button" tabindex="0" aria-label="选择试卷"
                  @click.stop="openPaperPick" @keydown.enter.prevent.stop="openPaperPick">…</span>
          </div>
          <p class="hint">
            {{ published
              ? '已发布后不可更改：试卷已锁定，换卷请新建考试。'
              : '发布考试时若试卷未发布会自动发布；发布后试卷锁定，不可更换。' }}
          </p>
        </div>

        <div class="field switch-line" :class="{ locked: published }">
          <ToggleSwitch v-model="form.loopEnabled" :disabled="published" />
          <span>循环考试</span>
          <i class="help" title="循环考试按周期重复发给学员">?</i>
          <em class="inline-hint">开启后，考试将以周期形式发给学员</em>
        </div>

        <div class="field required">
          <span class="label required">入场时间</span>
          <div class="range">
            <el-date-picker v-model="form.entryStartAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" />
            <span class="tilde">至</span>
            <el-date-picker v-model="form.entryEndAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" />
          </div>
        </div>

        <div class="field" :class="{ locked: published }">
          <div class="switch-line">
            <ToggleSwitch v-model="form.requiredType" :active-value="1" :inactive-value="2" :disabled="published" />
            <span>是否必修</span>
            <em class="switch-value">{{ form.requiredType === 1 ? '必修' : '选修' }}</em>
          </div>
        </div>

        <div class="field" :class="{ locked: published }">
          <span class="label required">通过分数</span>
          <p class="hint">当前试卷分数：{{ paperScoreText }} 分</p>
          <div class="switch-line">
            <ToggleSwitch v-model="form.passScoreType" :active-value="2" :inactive-value="1" :disabled="published" />
            <span>通过分数方式</span>
            <em class="switch-value">{{ form.passScoreType === 2 ? '总分比例' : '固定分数' }}</em>
            <span v-if="form.passScoreType === 1" class="inline-input">
              <el-input-number v-model="form.passScore" :min="0" :step="0.5" :disabled="published" :controls="false" />
              <em>分</em>
            </span>
            <span v-else class="inline-input">
              <el-input-number v-model="form.passRatio" :min="0" :max="100" :step="1" :disabled="published" :controls="false" />
              <em>%</em>
            </span>
          </div>
        </div>

        <div class="field" :class="{ locked: published }">
          <span class="label">学员奖励</span>
          <div class="switch-line">
            <ToggleSwitch v-model="form.rewardType" :active-value="2" :inactive-value="1" :disabled="published" />
            <span>学员奖励发放时机</span>
            <em class="switch-value">
              {{ form.rewardType === 2 ? '考试通过后' : form.rewardType === 1 ? '考试归档后' : '未开启' }}
            </em>
          </div>
          <div class="reward-box">
            <label class="reward-line">
              获得
              <el-input-number v-model="form.rewardCredit" :min="0" :step="0.5" :disabled="published" :controls="false" />
              学分
              <i class="help" title="考试完成后发放的学分">?</i>
            </label>
            <label class="reward-line">
              获得
              <el-input-number v-model="form.rewardPoints" :min="0" :step="1" :disabled="published" :controls="false" />
              积分
              <i class="help" title="考试完成后发放的积分">?</i>
            </label>
            <!-- 「获得证书」按 01 §F18.1 本期不实现 -->
          </div>
        </div>

        <div class="field participant-field" :class="{ locked: published }">
          <span class="label">参与人员</span>
          <div class="switch-line">
            <ToggleSwitch v-model="form.internalEnabled" :disabled="published" />
            <span>内部人员参与</span>
            <i class="help" title="关闭后内部员工不可参加；游客参与本期不实现">?</i>
          </div>

          <template v-if="form.internalEnabled === 1">
            <div class="switch-line">
              <ToggleSwitch v-model="form.participantScope" active-value="all" inactive-value="assigned" :disabled="published" />
              <span>参与范围</span>
              <em class="switch-value">{{ form.participantScope === 'all' ? '全员参与' : '指定员工参与' }}</em>
            </div>

            <div v-if="form.participantScope === 'assigned'" class="user-box"
                 :class="{ readonly: published }" role="button"
                 :tabindex="published ? -1 : 0" aria-label="选择参与员工"
                 @click="!published && openPicker('participant')"
                 @keydown.enter.prevent="!published && openPicker('participant')">
              <template v-if="form.participantNames.length">
                <span v-for="(n, i) in form.participantNames" :key="`${n}-${i}`" class="user-tag">
                  {{ n }}<i v-if="!published" role="button" tabindex="0" :aria-label="`移除 ${n}`"
                            @click.stop="removeUser('participant', i)"
                            @keydown.enter.prevent.stop="removeUser('participant', i)">×</i>
                </span>
              </template>
              <span v-else class="placeholder">请选择参与员工</span>
              <span v-if="!published" class="more-dots" role="button" tabindex="0" aria-label="选择参与员工"
                    @click.stop="openPicker('participant')" @keydown.enter.prevent.stop="openPicker('participant')">…</span>
            </div>

            <div class="switch-line">
              <ToggleSwitch v-model="form.allowOutOfScope" :disabled="published" />
              <span>允许指定范围外的内部员工参与</span>
              <i class="help" title="开启后，未在指定名单内的内部员工也可参加">?</i>
            </div>
          </template>

          <em v-if="published" class="lock-hint">已发布后不可改</em>
        </div>

        <div class="field">
          <span class="label">优秀分数</span>
          <div class="switch-line">
            <ToggleSwitch v-model="form.excellentScoreType" :active-value="2" :inactive-value="1" />
            <span>优秀分数方式</span>
            <em class="switch-value">{{ form.excellentScoreType === 2 ? '总分比例' : '固定分数' }}</em>
            <span v-if="form.excellentScoreType === 1" class="inline-input">
              <el-input-number v-model="form.excellentScore" :min="0" :step="0.5" :controls="false" />
              <em>分</em>
            </span>
            <span v-else class="inline-input">
              <el-input-number v-model="form.excellentRatio" :min="0" :max="100" :step="1" :controls="false" />
              <em>%</em>
            </span>
          </div>
          <p class="hint">本期统计按及格线计算，优秀分配置仅保存、暂不参与统计。</p>
        </div>

        <div class="field">
          <span class="label">负责人</span>
          <div class="user-box" :class="{ readonly: published }" role="button"
               :tabindex="published ? -1 : 0" aria-label="选择负责人"
               @click="!published && openPicker('owner')" @keydown.enter.prevent="!published && openPicker('owner')">
            <template v-if="form.ownerNames.length">
              <span v-for="(n, i) in form.ownerNames" :key="`${n}-${i}`" class="user-tag">
                {{ n }}<i v-if="!published" role="button" tabindex="0" :aria-label="`移除 ${n}`"
                          @click.stop="removeUser('owner', i)"
                          @keydown.enter.prevent.stop="removeUser('owner', i)">×</i>
              </span>
            </template>
            <span v-else class="placeholder">最多选择50个负责人</span>
            <span v-if="!published" class="more-dots" role="button" tabindex="0" aria-label="选择负责人"
                  @click.stop="openPicker('owner')" @keydown.enter.prevent.stop="openPicker('owner')">…</span>
          </div>
        </div>

        <div class="field">
          <span class="label">批阅人</span>
          <div class="user-box" :class="{ readonly: published }" role="button"
               :tabindex="published ? -1 : 0" aria-label="选择批阅人"
               @click="!published && openPicker('grader')" @keydown.enter.prevent="!published && openPicker('grader')">
            <template v-if="form.graderNames.length">
              <span v-for="(n, i) in form.graderNames" :key="`${n}-${i}`" class="user-tag">
                {{ n }}<i v-if="!published" role="button" tabindex="0" :aria-label="`移除 ${n}`"
                          @click.stop="removeUser('grader', i)"
                          @keydown.enter.prevent.stop="removeUser('grader', i)">×</i>
              </span>
            </template>
            <span v-else class="placeholder">最多选择50个批阅人</span>
            <span v-if="!published" class="more-dots" role="button" tabindex="0" aria-label="选择批阅人"
                  @click.stop="openPicker('grader')" @keydown.enter.prevent.stop="openPicker('grader')">…</span>
          </div>
        </div>

        <div class="field">
          <span class="label">考试说明</span>
          <div class="textarea-wrap">
            <el-input v-model="form.description" maxlength="10000" :rows="5" placeholder="请输入考试说明" type="textarea" />
            <em>{{ form.description.length }}/10000</em>
          </div>
        </div>
      </section>

      <!-- ============ 通知设置 ============ -->
      <section class="card notify-card">
        <p class="section-title">
          通知设置
          <i class="help" title="通知开关只控制是否发送，不在本模块维护通知模板">?</i>
        </p>
        <div class="switch-list">
          <div v-for="n in NOTIFY_ITEMS" :key="n.key" class="switch-line">
            <ToggleSwitch v-model="notify[n.key]" />
            <span>{{ n.label }}</span>
            <i class="help" :title="n.tip">?</i>
          </div>
        </div>
        <!-- 模板细分（默认模板/个性模板）按 01 §2.2 本期不做 -->
      </section>
    </div>

    <!-- ============ 更多设置 ============ -->
    <section class="more-card">
      <el-button class="more-toggle" @click="moreOpen = !moreOpen">
        {{ moreOpen ? '收起更多设置' : '展开更多设置' }}
        <span class="chev" :class="{ open: moreOpen }" aria-hidden="true"><el-icon><CaretTop /></el-icon></span>
      </el-button>

      <div v-show="moreOpen" class="more-grid">
        <!-- 左栏 -->
        <div class="more-col">
          <div class="group extra-group">
            <p class="group-title">常规设置</p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.scheduledPublish" />
                <span>定时发布考试</span>
                <i class="help" title="到点自动发布，未发布前仍可修改配置">?</i>
              </div>
              <div v-if="advanced.scheduledPublish" class="sub-line">
                <el-date-picker v-model="advanced.scheduledPublishAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" />
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.scheduledEnd" />
                <span>定时结束考试</span>
              </div>
              <div v-if="advanced.scheduledEnd" class="sub-line">
                <el-date-picker v-model="advanced.scheduledEndAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" />
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.wrongToWrongBook" />
                <span>答题错误将自动进入错题本</span>
              </div>
              <!-- 考前签名按 D-15/D-17 推迟到学员端模块，不在发布页展示 -->
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.fixedIp" />
                <span>固定 IP 考试</span>
                <i class="help" title="只允许配置的 IP 段参加考试">?</i>
              </div>
              <el-input v-if="advanced.fixedIp" v-model="fixedIpText" class="ip-input" :rows="2"
                        placeholder="每行一个 IP，例如 10.0.0.1" type="textarea" />
            </div>
          </div>

          <div class="group">
            <p class="group-title">考试设置</p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.examSetting.unifiedSubmitTime" />
                <span>统一交卷时间</span>
                <i class="help" title="所有考生在同一时间统一交卷">?</i>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.examSetting.durationEnabled" />
                <span>统一考试时长</span>
                <span v-if="advanced.examSetting.durationEnabled" class="inline-input">
                  <el-input-number v-model="advanced.examSetting.durationMin" :min="1" :controls="false" />
                  <em>分钟</em>
                </span>
                <i class="help" title="从开考起计时，到时自动交卷">?</i>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.examSetting.minAnswerEnabled" />
                <span>最短答题时长</span>
                <span v-if="advanced.examSetting.minAnswerEnabled" class="inline-input">
                  <el-input-number v-model="advanced.examSetting.minAnswerMin" :min="0" :controls="false" />
                  <em>分钟</em>
                </span>
                <i class="help" title="未满最短答题时长不允许交卷">?</i>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.examSetting.includeQuitTime" />
                <span>考试时长包含中途退出考试时间</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.examSetting.repeatEnabled" />
                <span>允许重复考试次数</span>
                <span v-if="advanced.examSetting.repeatEnabled" class="inline-input">
                  <el-input-number v-model="advanced.examSetting.repeatLimit" :min="2" :controls="false" />
                  <em>次</em>
                </span>
                <i class="help" title="开启后可多次参加，取最高成绩">?</i>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.grading.aiGradeQa" />
                <span>允许问答题智能批阅</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.examSetting.lateLimitEnabled" />
                <span>允许迟到</span>
                <span v-if="advanced.examSetting.lateLimitEnabled" class="inline-input">
                  <el-input-number v-model="advanced.examSetting.lateLimitMin" :min="0" :controls="false" />
                  <em>分钟</em>
                </span>
              </div>
            </div>
          </div>

          <div class="group">
            <p class="group-title">批阅设置</p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.grading.hideStudentInfo" />
                <span>批阅时隐藏考生信息</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.grading.autoGradeFill" />
                <span>填空题自动批阅</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.grading.autoGradeQa" />
                <span>问答题自动批阅</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.grading.autoGradeUnanswered" />
                <span>用户未作答不自动批阅</span>
              </div>
            </div>
          </div>

          <div class="group">
            <p class="group-title">答卷设置</p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.answerView.viewScore" />
                <span>允许学员查看考试成绩</span>
              </div>
              <div v-if="advanced.answerView.viewScore" class="sub-box">
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.viewScoreValue" />
                  <span>允许学员查看考试分数</span>
                </div>
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.viewPassFlag" />
                  <span>允许学员查看是否通过标识</span>
                </div>
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.viewPointScore" />
                  <span>允许学员查看考核点得分情况</span>
                </div>
              </div>

              <div class="switch-line">
                <ToggleSwitch v-model="advanced.answerView.viewAnswerDetail" />
                <span>允许学员查看考试答卷详情页面</span>
              </div>
              <div v-if="advanced.answerView.viewAnswerDetail" class="sub-box">
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.wrongOnly" />
                  <span>仅支持学员查看错题</span>
                </div>
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.viewAnswer" />
                  <span>允许学员查看考试答案</span>
                </div>
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.viewAnalysis" />
                  <span>允许学员查看考试解析</span>
                </div>
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.viewAnswerTimeRange" />
                  <span>允许查看答题时间范围</span>
                </div>
                <div class="switch-line">
                  <ToggleSwitch v-model="advanced.answerView.forbidPdfDownload" />
                  <span>不允许学员下载 PDF 答题结果</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右栏 -->
        <div class="more-col">
          <div class="group" :class="{ locked: published }">
            <p class="group-title">
              防作弊限制
              <em v-if="published">已发布后不可改</em>
            </p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.antiCheat.shuffleQuestion" :disabled="published" />
                <span>打乱试题顺序</span>
                <i class="help" title="每个考生的题目顺序随机">?</i>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.antiCheat.shuffleOption" :disabled="published" />
                <span>打乱试题选项顺序</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.antiCheat.pcOnly" :disabled="published" />
                <span>仅允许在PC端参与考试</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.antiCheat.mobileOnly" :disabled="published" />
                <span>仅允许在手机端参与考试</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.antiCheat.screenSwitchEnabled" :disabled="published" />
                <span>考试切屏限制</span>
                <span v-if="advanced.antiCheat.screenSwitchEnabled" class="inline-input">
                  <el-input-number v-model="advanced.antiCheat.screenSwitchLimit" :min="1" :disabled="published" :controls="false" />
                  <em>次</em>
                </span>
                <i class="help" title="超过限制次数自动交卷">?</i>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.antiCheat.forceSubmitNoAction" :disabled="published" />
                <span>无操作强制交卷</span>
              </div>
            </div>
          </div>

          <div class="group">
            <p class="group-title">信息安全设置</p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.security.copyDownloadImage" />
                <span>允许复制下载图片</span>
              </div>
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.security.copyText" />
                <span>允许复制文字</span>
              </div>
            </div>
          </div>

          <div class="group" :class="{ locked: published }">
            <p class="group-title">
              学习任务限制
              <em v-if="published">已发布后不可改</em>
            </p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.learningTask.enabled" :disabled="published" />
                <span>生成学习任务</span>
              </div>
              <div v-if="advanced.learningTask.enabled" class="switch-line">
                <ToggleSwitch v-model="advanced.learningTask.removeOn" active-value="pass" inactive-value="submit" :disabled="published" />
                <span>学习任务移除时机</span>
                <em class="switch-value">{{ advanced.learningTask.removeOn === 'pass' ? '考试通过后' : '考试提交后' }}</em>
              </div>
            </div>
          </div>

          <div class="group">
            <p class="group-title">团队管理设置</p>
            <div class="switch-list">
              <div class="switch-line">
                <ToggleSwitch v-model="advanced.teamManage.allowTeamManagerAddRemove" />
                <span>允许团队管理者添加/移除学员</span>
                <i class="help" title="开启后团队管理者可自行维护考生">?</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="actions">
      <el-button class="btn" :disabled="saving" @click="save(false)">
        {{ saving ? '保存中…' : '保存草稿' }}
      </el-button>
      <el-button class="btn primary" :disabled="saving" @click="save(true)">
        {{ published ? '更新后发布' : '发布考试' }}
      </el-button>
    </div>

    <UserMultiPickerDrawer v-if="picker"
      :title="pickerTitle"
      :max="picker === 'participant' ? 500 : 50"
      :selected-ids="pickerIds"
      :selected-names="pickerNames"
      @close="picker = ''"
      @confirm="onPickUsers" />

    <PaperPickDrawer v-if="showPaperPick" @close="showPaperPick = false" @picked="onPaperPicked" />
  </div>
</template>

<script setup lang="ts">
import { CaretTop } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  addArrangeStudents, createArrange, getArrangeCatalogTree, getArrangeDetail, publishArrange, updateArrange,
  type ArrangeCatalogNode
} from '@/api/arrange'
import type { PaperItem } from '@/api/paper'
import ToggleSwitch from './ToggleSwitch.vue'
import UserMultiPickerDrawer from './UserMultiPickerDrawer.vue'
import PaperPickDrawer from './PaperPickDrawer.vue'

const props = defineProps<{
  arrangeId?: string
  /** 向导里创建时，paperId 由第一步决定 */
  paperId?: string
  paperBuildType?: number
  defaultCatalogId?: string
}>()
const emit = defineEmits<{ saved: [id: string]; published: []; 'paper-changed': [paper: PaperItem] }>()

/** 通知开关：F18 的 5 项 + 原平台截图里的「题目反馈通知」。 */
const NOTIFY_ITEMS = [
  { key: 'arrangeNotice', label: '发送考试安排通知', tip: '发布考试后通知已安排的考生' },
  { key: 'cancelNotice', label: '发送考试安排取消通知', tip: '取消安排时通知考生' },
  { key: 'paperGradeNotice', label: '发送试卷批阅通知', tip: '试卷批阅完成后通知考生' },
  { key: 'scoreNotice', label: '成绩下发通知', tip: '成绩下发后通知考生' },
  { key: 'scheduledMessage', label: '定时消息设置', tip: '按设定时间向考生发送提醒' }
] as const
type NotifyKey = (typeof NOTIFY_ITEMS)[number]['key']

const arrangeId = ref(props.arrangeId ?? '')
const published = ref(false)
const saving = ref(false)
const treeRoot = ref<ArrangeCatalogNode | null>(null)
const fixedIpText = ref('')
const moreOpen = ref(true)
const picker = ref<'' | 'owner' | 'grader' | 'participant'>('')
const showPaperPick = ref(false)
/** 发布后试卷本体锁定：原平台没有"更换试卷"入口，历史答卷也不应被换卷影响。 */
const openPaperPick = () => {
  if (!published.value) showPaperPick.value = true
}

const form = reactive({
  name: '',
  catalogId: props.defaultCatalogId ?? 'root',
  code: '',
  paperId: props.paperId ?? '',
  paperBuildType: props.paperBuildType ?? 0,
  paperName: '',
  important: 0,
  secrecy: 0,
  loopEnabled: 0,
  entryStartAt: '',
  entryEndAt: '',
  requiredType: 1,
  passScoreType: 1,
  passScore: 60,
  passRatio: 60,
  rewardType: 0,
  rewardCredit: 0,
  rewardPoints: 0,
  internalEnabled: 1,
  participantScope: 'assigned' as 'assigned' | 'all',
  participantUserIds: [] as string[],
  participantNames: [] as string[],
  allowOutOfScope: 0,
  excellentScoreType: 1,
  excellentScore: 0,
  excellentRatio: 0,
  description: '',
  ownerUserIds: [] as string[],
  ownerNames: [] as string[],
  graderUserIds: [] as string[],
  graderNames: [] as string[]
})

const notify = reactive<Record<NotifyKey, number>>({
  arrangeNotice: 1,
  cancelNotice: 0,
  paperGradeNotice: 0,
  scoreNotice: 1,
  scheduledMessage: 0
})

const DEF_EXAM_SETTING = {
  unifiedSubmitTime: 0,
  durationEnabled: 0,
  durationMin: 30,
  minAnswerEnabled: 0,
  minAnswerMin: 10,
  includeQuitTime: 0,
  repeatEnabled: 0,
  repeatLimit: 2,
  lateLimitEnabled: 0,
  lateLimitMin: 0
}
const DEF_ANTI_CHEAT = {
  shuffleQuestion: 0,
  shuffleOption: 0,
  pcOnly: 0,
  mobileOnly: 0,
  screenSwitchEnabled: 0,
  screenSwitchLimit: 0,
  forceSubmitNoAction: 0
}

const advanced = reactive<any>({
  scheduledPublish: 0,
  scheduledPublishAt: '',
  scheduledEnd: 0,
  scheduledEndAt: '',
  wrongToWrongBook: 0,
  fixedIp: 0,
  fixedIpList: [],
  examSetting: { ...DEF_EXAM_SETTING },
  antiCheat: { ...DEF_ANTI_CHEAT },
  grading: { hideStudentInfo: 0, autoGradeFill: 0, autoGradeQa: 0, autoGradeUnanswered: 0, aiGradeQa: 0 },
  security: { copyDownloadImage: 1, copyText: 1 },
  learningTask: { enabled: 0, removeOn: 'pass' },
  answerView: {
    viewScore: 1, viewScoreValue: 1, viewPassFlag: 1, viewPointScore: 1, viewAnswerDetail: 1,
    wrongOnly: 0, viewAnswer: 1, viewAnalysis: 1, viewAnswerTimeRange: 0, forbidPdfDownload: 0
  },
  teamManage: { allowTeamManagerAddRemove: 0 }
})

interface FlatCatalog extends ArrangeCatalogNode { level: number }
const flatCatalogs = computed<FlatCatalog[]>(() => {
  if (!treeRoot.value) return []
  const out: FlatCatalog[] = []
  const walk = (n: ArrangeCatalogNode, level: number) => {
    out.push({ ...n, level })
    for (const c of n.children || []) walk(c, level + 1)
  }
  walk(treeRoot.value, 0)
  return out
})

const paperScore = ref(0)
const paperScoreText = computed(() => (paperScore.value > 0 ? String(paperScore.value) : '--'))

/** 组件内统一用 0/1 存开关；模板里用这两个方法读写。 */
const setFlag = (obj: any, key: string, checked: boolean) => { obj[key] = checked ? 1 : 0 }

const numToBool = (v: unknown) => v === 1 || v === true

const toLocalInput = (v: string | null | undefined) => {
  if (!v) return ''
  // 后端是 yyyy-MM-dd HH:mm:ss，datetime-local 需要 yyyy-MM-ddTHH:mm
  return String(v).replace(' ', 'T').slice(0, 16)
}
const toBackend = (v: string) => (v ? v.replace('T', ' ') + ':00' : null)

const asObject = (raw: unknown): Record<string, any> =>
  raw && typeof raw === 'object' ? (raw as Record<string, any>) : {}

const openPicker = (type: 'owner' | 'grader' | 'participant') => { picker.value = type }

const pickerTitle = computed(() => {
  if (picker.value === 'owner') return '选择负责人'
  if (picker.value === 'grader') return '选择批阅人'
  return '选择参与员工'
})
const pickerIds = computed(() => {
  if (picker.value === 'owner') return form.ownerUserIds
  if (picker.value === 'grader') return form.graderUserIds
  return form.participantUserIds
})
const pickerNames = computed(() => {
  if (picker.value === 'owner') return form.ownerNames
  if (picker.value === 'grader') return form.graderNames
  return form.participantNames
})

const onPickUsers = (ids: string[], names: string[]) => {
  if (picker.value === 'owner') {
    form.ownerUserIds = ids
    form.ownerNames = names
  } else if (picker.value === 'grader') {
    form.graderUserIds = ids
    form.graderNames = names
  } else {
    form.participantUserIds = ids
    form.participantNames = names
  }
  picker.value = ''
}

const removeUser = (type: 'owner' | 'grader' | 'participant', index: number) => {
  if (type === 'owner') {
    form.ownerUserIds.splice(index, 1)
    form.ownerNames.splice(index, 1)
  } else if (type === 'grader') {
    form.graderUserIds.splice(index, 1)
    form.graderNames.splice(index, 1)
  } else {
    form.participantUserIds.splice(index, 1)
    form.participantNames.splice(index, 1)
  }
}

/** 使用试卷（F18.1 允许发布后更换）：同步给向导，保证上一步回看的是新试卷。 */
const onPaperPicked = (p: PaperItem) => {
  form.paperId = p.id
  form.paperBuildType = p.buildType
  form.paperName = p.name
  paperScore.value = Number(p.totalScore ?? 0)
  showPaperPick.value = false
  emit('paper-changed', p)
}

const buildSettings = () => ({
  notifySettings: JSON.stringify({ ...notify }),
  publishSettings: JSON.stringify({
    description: form.description,
    excellentScoreType: form.excellentScoreType,
    excellentScore: form.excellentScore,
    excellentRatio: form.excellentRatio,
    rewardPoints: form.rewardPoints,
    graderUserIds: form.graderUserIds,
    graderNames: form.graderNames,
    // 参与人员：游客参与/动态用户组同步本期不做（用户 2026-10-20 确认）
    internalEnabled: form.internalEnabled,
    participantScope: form.participantScope,
    participantUserIds: form.participantUserIds,
    participantNames: form.participantNames,
    allowOutOfScope: form.allowOutOfScope
  }),
  advancedSettings: JSON.stringify({
    ...advanced,
    fixedIpList: fixedIpText.value.split('\n').map(s => s.trim()).filter(Boolean)
  })
})

const validate = (forPublish: boolean) => {
  if (!form.name.trim()) { toast.warn('请输入考试名称'); return false }
  if (!form.catalogId) { toast.warn('请选择考试分类'); return false }
  if (!forPublish) return true
  if (!form.paperId) { toast.warn('请选择使用试卷'); return false }
  if (!published.value && form.internalEnabled === 1 && form.participantScope === 'assigned'
      && !form.participantUserIds.length) {
    toast.warn('请选择参与员工'); return false
  }
  if (!form.entryStartAt || !form.entryEndAt) { toast.warn('请填写入场时间'); return false }
  if (form.entryEndAt <= form.entryStartAt) { toast.warn('入场结束时间需晚于开始时间'); return false }
  if (form.passScoreType === 1 && !(Number(form.passScore) > 0)) { toast.warn('请输入通过分数'); return false }
  if (form.passScoreType === 2 && !(Number(form.passRatio) > 0)) { toast.warn('请输入通过分数比例'); return false }
  if (form.excellentScoreType === 1 && Number(form.excellentScore) < 0) { toast.warn('优秀分数不能为负'); return false }
  if (form.excellentScoreType === 2 && Number(form.excellentRatio) < 0) { toast.warn('优秀比例不能为负'); return false }
  if (advanced.fixedIp && !fixedIpText.value.trim()) { toast.warn('开启固定 IP 后请填写 IP 列表'); return false }
  if (advanced.antiCheat.pcOnly && advanced.antiCheat.mobileOnly) {
    toast.warn('不能同时限制仅 PC 端和仅手机端参与'); return false
  }
  if (advanced.examSetting.durationEnabled && !(Number(advanced.examSetting.durationMin) > 0)) {
    toast.warn('请输入统一考试时长'); return false
  }
  return true
}

const save = async (alsoPublish: boolean) => {
  if (!validate(alsoPublish)) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      catalogId: form.catalogId,
      code: form.code,
      important: form.important,
      secrecy: form.secrecy,
      loopEnabled: form.loopEnabled,
      entryStartAt: toBackend(form.entryStartAt),
      entryEndAt: toBackend(form.entryEndAt),
      requiredType: form.requiredType,
      passScoreType: form.passScoreType,
      passScore: form.passScore,
      passRatio: form.passScoreType === 2 ? form.passRatio : null,
      rewardType: form.rewardType,
      rewardCredit: form.rewardCredit,
      attemptLimit: advanced.examSetting.repeatEnabled ? Math.max(2, Number(advanced.examSetting.repeatLimit) || 2) : 1,
      lateLimitMin: advanced.examSetting.lateLimitEnabled ? Number(advanced.examSetting.lateLimitMin) || 0 : 0,
      screenSwitchLimit: advanced.antiCheat.screenSwitchEnabled ? Number(advanced.antiCheat.screenSwitchLimit) || 0 : 0,
      paperId: form.paperId || undefined,
      paperBuildType: form.paperBuildType || undefined,
      stepNumber: 3,
      ownerUserIds: form.ownerUserIds.join(','),
      ownerNames: form.ownerNames.join(';'),
      ...buildSettings()
    }
    if (!arrangeId.value) {
      const res = await createArrange(payload as any)
      arrangeId.value = res.id
    } else {
      await updateArrange(arrangeId.value, payload as any)
    }
    toast.success('考试配置已保存')
    emit('saved', arrangeId.value)
    if (alsoPublish) {
      // 参与人员为「指定员工」时，发布时落成考生名单（join_type=1 指派）。
      // 已发布考试的参与人员按 F18.1 不在可改清单内，此块已锁定，不再同步。
      if (!published.value && form.internalEnabled === 1 && form.participantScope === 'assigned'
          && form.participantUserIds.length) {
        await addArrangeStudents(arrangeId.value, form.participantUserIds, 1)
      }
      await publishArrange(arrangeId.value)
      toast.success('考试已发布')
      published.value = true
      emit('published')
    }
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}

// 向导第三步的右上角「发布考试 / 更新后发布」走同一个保存+发布逻辑
defineExpose({ save })

onMounted(async () => {
  try {
    treeRoot.value = await getArrangeCatalogTree()
  } catch { /* 拦截器已提示 */ }
  if (!arrangeId.value) return
  try {
    const d = await getArrangeDetail(arrangeId.value)
    published.value = d.status > 0
    form.name = d.name
    form.catalogId = d.catalogId
    form.code = d.code || ''
    form.important = d.important ?? 0
    form.secrecy = d.secrecy ?? 0
    form.loopEnabled = d.loopEnabled ?? 0
    form.entryStartAt = toLocalInput(d.entryStartAt)
    form.entryEndAt = toLocalInput(d.entryEndAt)
    form.requiredType = d.requiredType ?? 1
    form.passScoreType = d.passScoreType ?? 1
    form.passScore = Number(d.passScore ?? 0)
    form.passRatio = Number(d.passRatio ?? 60)
    form.rewardType = d.rewardType ?? 0
    form.rewardCredit = Number(d.rewardCredit ?? 0)
    form.ownerUserIds = d.ownerUserIds ?? []
    form.ownerNames = d.ownerNames ?? []
    paperScore.value = Number(d.paperScore ?? 0)
    form.paperId = d.paperId || ''
    form.paperBuildType = d.paperBuildType ?? 0
    form.paperName = d.paperName || ''

    // 通知设置：只做开关
    const ns = asObject(d.notifySettings)
    const emptyNotify = Object.keys(ns).length === 0
    for (const item of NOTIFY_ITEMS) {
      notify[item.key] = numToBool(ns[item.key]) ||
        (emptyNotify && (item.key === 'arrangeNotice' || item.key === 'scoreNotice')) ? 1 : 0
    }

    // 发布设置（优秀分数/说明/积分/批阅人）
    const ps = asObject(d.publishSettings)
    form.description = typeof ps.description === 'string' ? ps.description : ''
    form.excellentScoreType = Number(ps.excellentScoreType ?? 1)
    form.excellentScore = Number(ps.excellentScore ?? 0)
    form.excellentRatio = Number(ps.excellentRatio ?? 0)
    form.rewardPoints = Number(ps.rewardPoints ?? 0)
    form.graderUserIds = Array.isArray(ps.graderUserIds) ? ps.graderUserIds.map(String) : []
    form.graderNames = Array.isArray(ps.graderNames) ? ps.graderNames.map(String) : []
    form.internalEnabled = ps.internalEnabled == null ? 1 : Number(ps.internalEnabled)
    form.participantScope = ps.participantScope === 'all' ? 'all' : 'assigned'
    form.participantUserIds = Array.isArray(ps.participantUserIds) ? ps.participantUserIds.map(String) : []
    form.participantNames = Array.isArray(ps.participantNames) ? ps.participantNames.map(String) : []
    form.allowOutOfScope = Number(ps.allowOutOfScope ?? 0)

    const adv = asObject(d.advancedSettings)
    Object.assign(advanced, adv)
    advanced.examSetting = { ...DEF_EXAM_SETTING, ...asObject(adv.examSetting) }
    advanced.antiCheat = { ...DEF_ANTI_CHEAT, ...asObject(adv.antiCheat) }
    advanced.grading = { ...advanced.grading, ...asObject(adv.grading) }
    advanced.security = { ...advanced.security, ...asObject(adv.security) }
    advanced.learningTask = { ...advanced.learningTask, ...asObject(adv.learningTask) }
    advanced.answerView = { ...advanced.answerView, ...asObject(adv.answerView) }
    advanced.teamManage = { ...advanced.teamManage, ...asObject(adv.teamManage) }
    fixedIpText.value = Array.isArray(adv.fixedIpList) ? adv.fixedIpList.join('\n') : ''

    // 旧数据没有这些开关时，用顶层的次数/限制列反推
    advanced.examSetting.repeatEnabled = (d.attemptLimit ?? 1) > 1 ? 1 : 0
    advanced.examSetting.repeatLimit = d.attemptLimit ?? 2
    advanced.examSetting.lateLimitEnabled = (d.lateLimitMin ?? 0) > 0 ? 1 : 0
    advanced.examSetting.lateLimitMin = d.lateLimitMin ?? 0
    advanced.antiCheat.screenSwitchEnabled = (d.screenSwitchLimit ?? 0) > 0 ? 1 : 0
    advanced.antiCheat.screenSwitchLimit = d.screenSwitchLimit ?? 0
  } catch { /* 拦截器已提示 */ }
})
</script>

<style scoped lang="scss">
.publish-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 28px;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px;
  align-items: start;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 6px 8px 8px;
  background: var(--color-paper);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);

  &::before {
    content: '';
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: var(--color-accent);
  }
}

/* ---- 表单 ---- */
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .label {
    font-size: 13px;
    color: var(--color-ink-2);
    &.required::after { content: ' *'; color: var(--color-error); }
  }

  > input,
  > select {
    width: 100%;
    box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    font-size: 13px;
    color: var(--color-ink);
    background: var(--color-paper);
    outline: none;

    &:focus { border-color: var(--color-accent); }
    &:disabled { background: var(--color-paper-2); color: var(--color-rule-2); cursor: not-allowed; }
  }

  &.locked .label { color: var(--color-rule-2); }
}

.input-wrap,
.textarea-wrap {
  position: relative;

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 7px 64px 7px 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    font-size: 13px;
    color: var(--color-ink);
    outline: none;
    resize: vertical;

    &:focus { border-color: var(--color-accent); }
  }

  textarea { min-height: 96px; line-height: 1.7; }

  em {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-style: normal;
    font-size: 12px;
    color: var(--color-rule-2);
  }

  input + em { bottom: auto; top: 50%; transform: translateY(-50%); }
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-rule-2);
  line-height: 1.7;
}

.inline-hint {
  font-style: normal;
  font-size: 12px;
  color: var(--color-rule-2);
}

.lock-hint {
  font-style: normal;
  font-size: 11px;
  color: var(--color-rule-2);
}

.help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-rule-2);
  border-radius: 50%;
  font-style: normal;
  font-size: 10px;
  line-height: 1;
  color: var(--color-rule-2);
  cursor: help;
  flex-shrink: 0;
}

.switch-line {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  font-size: 13px;
  color: var(--color-ink-2);
}

/* 「循环考试」这类同时带 field / switch-line 的行必须横排 */
.field.switch-line { flex-direction: row; align-items: center; }

.switch-value {
  padding: 1px 8px;
  border-radius: 12px;
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
}

.switch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-line {
  padding-left: 44px;

  input {
    padding: 6px 8px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
  }
}

.sub-box {
  margin-left: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
  padding: 10px 14px;
  border-radius: 4px;
  background: var(--color-paper-2);
}

.inline-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  input {
    width: 92px;
    padding: 5px 8px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    &:disabled { background: var(--color-paper-2); color: var(--color-rule-2); }
  }

  em { font-style: normal; font-size: 12px; color: var(--color-muted); }
}

.range {
  display: flex;
  align-items: center;
  gap: 10px;

  input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
  }

  .tilde { color: var(--color-muted); font-size: 12px; }
}

.reward-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 4px;
  background: var(--color-paper-2);
}

.reward-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-ink-2);

  input {
    width: 92px;
    padding: 5px 8px;
    border: 1px solid var(--color-rule-2);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    &:disabled { background: var(--color-paper-2); color: var(--color-rule-2); }
  }
}

.user-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 4px 34px 4px 10px;
  &.locked {
    background: var(--color-paper-2);
    border-color: var(--color-rule);
    cursor: not-allowed;
    .user-tag { color: var(--color-rule-2); background: var(--color-rule); border-color: var(--color-rule); }
  }
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  cursor: pointer;
  position: relative;

  &:hover { border-color: var(--color-accent); }
  &.readonly { background: var(--color-paper-2); cursor: default; }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }

  .placeholder { font-size: 13px; color: var(--color-rule-2); }

  .more-dots {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
    letter-spacing: 1px;
    cursor: pointer;

    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 2px; }
  }
}

.user-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--color-rule-2);
  border-radius: 3px;
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
  font-size: 12px;

  i { font-style: normal; color: var(--color-muted); cursor: pointer; &:hover { color: var(--color-error); }
    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; border-radius: 2px; }
  }
}

.notify-card { min-height: 320px; }

.ip-input {
  width: calc(100% - 44px);
  box-sizing: border-box;
  margin-left: 44px;
  border-radius: 4px;
  font-size: 13px;
}

/* ---- 更多设置 ---- */
.more-card {
  border-top: 1px solid var(--color-rule);
  background: var(--color-paper);
  padding-top: 8px;
}

.more-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-ink-2);
  cursor: pointer;

  &:hover { color: var(--color-accent); }
  .chev { display: inline-block; transition: transform .16s ease; &.open { transform: rotate(180deg); } }
}

.more-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px;
  padding: 8px 8px 0;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
}

.more-col {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &.extra-group { order: 9; }

  &.locked {
    .group-title { color: var(--color-rule-2); }
    .switch-line { color: var(--color-rule-2); }
  }
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);

  &::before {
    content: '';
    width: 3px;
    height: 13px;
    border-radius: 2px;
    background: var(--color-accent);
  }

  em { font-style: normal; font-size: 11px; font-weight: 400; color: var(--color-rule-2); }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 20px;
  border: 1px solid var(--color-rule-2);
  border-radius: 4px;
  background: var(--color-paper);
  font-size: 13px;
  color: var(--color-ink-2);
  cursor: pointer;

  &.primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-ink); }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
