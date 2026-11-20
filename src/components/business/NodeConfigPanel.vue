<template>
  <div class="config-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-bar" :style="{ background: titleColor }"></span>
        {{ titleText }}
      </div>
      <span
        class="close-btn"
        role="button"
        tabindex="0"
        aria-label="关闭"
        @click="$emit('close')"
        @keydown.enter.prevent="$emit('close')"
      >×</span>
    </div>

    <div class="panel-body">
      <!-- 节点名称 -->
      <div class="form-item">
        <label class="form-label required">节点名称</label>
        <input type="text" class="form-input" v-model="localData.nodeName" placeholder="请输入节点名称" maxlength="50" />
      </div>

      <!-- 旁白节点（v1.2）：仅旁白文本 -->
      <template v-if="isNarration">
        <div class="form-item">
          <label class="form-label required">旁白内容</label>
          <textarea class="form-textarea" v-model="localData.narration" placeholder="请输入旁白文本，例如场景转换提示或学员处境交代" rows="6"></textarea>
          <span class="char-count">{{ (localData.narration || '').length }}/500</span>
        </div>
      </template>

      <!-- 陪练者问 -->
      <div class="form-item" v-if="!isStudent && !isNarration">
        <label class="form-label required">陪练者问</label>
        <textarea class="form-textarea" v-model="localData.trainerQuestion" placeholder="请输入陪练者的话术内容" rows="4"></textarea>
        <span class="char-count">{{ (localData.trainerQuestion || '').length }}/500</span>
      </div>

      <!-- 学员字段 -->
      <template v-if="isStudent && !isNarration">
        <div class="form-item">
          <label class="form-label required">标准话术</label>
          <textarea class="form-textarea" v-model="localData.standardScript" placeholder="请输入标准话术" rows="4"></textarea>
          <span class="char-count">{{ (localData.standardScript || '').length }}/1000</span>
        </div>

        <div class="form-item">
          <label class="form-label">要点 <span class="label-tip">最多10个</span></label>
          <div class="keypoints-list">
            <div class="keypoint-item" v-for="(point, index) in localData.keyPoints" :key="point.id">
              <span class="point-index">{{ index + 1 }}</span>
              <input type="text" class="form-input" v-model="point.content" placeholder="请输入要点内容" />
              <button class="btn-icon" @click="removeKeypoint(index)" title="删除" aria-label="删除该要点">×</button>
            </div>
            <button v-if="localData.keyPoints.length < 10" class="btn-add" @click="addKeypoint">
              + 添加要点
            </button>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">解析</label>
          <textarea class="form-textarea" v-model="localData.analysis" placeholder="请输入话术思路解析，例如可说明陪练者的心理活动、告知学员如此陈述的原因" rows="4"></textarea>
          <span class="char-count">{{ (localData.analysis || '').length }}/1000</span>
        </div>

        <div class="form-item">
          <label class="form-label required">流转条件</label>
          <div class="condition-group">
            <label class="condition-item">
              <input type="radio" value="normal" v-model="localData.passCondition.type" />
              <span>正常流转</span>
            </label>
            <label class="condition-item">
              <input type="radio" value="any_n" v-model="localData.passCondition.type" />
              <span>命中任意</span>
              <el-input-number
                class="num-input"
                v-model="localData.passCondition.n"
                :min="1"
                :max="localData.keyPoints.length || 1"
                :disabled="localData.passCondition.type !== 'any_n'"
                controls-position="right"
              />
              <span>个要点</span>
            </label>
            <label class="condition-item">
              <input type="radio" value="specified" v-model="localData.passCondition.type" />
              <span>命中部分要点</span>
            </label>

            <!-- 指定要点勾选 -->
            <div v-if="localData.passCondition.type === 'specified'" class="specified-points">
              <div v-if="localData.keyPoints.length === 0" class="empty-tip">请先添加要点</div>
              <label
                v-for="point in localData.keyPoints"
                :key="point.id"
                class="point-checkbox"
              >
                <input
                  type="checkbox"
                  :value="point.id"
                  v-model="localData.passCondition.specifiedPointIds"
                />
                <span>{{ point.content || '（未命名要点）' }}</span>
              </label>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="panel-footer">
      <button class="btn btn-danger" @click="$emit('delete')">删除节点</button>
      <div class="footer-right">
        <button class="btn btn-default" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { FlowNodeData } from '@/types/speech'

const props = defineProps<{
  nodeData: FlowNodeData
  subType: 'trainer' | 'student'
  /** v1.2 旁白节点标记：narration 时仅显示旁白文本输入 */
  nodeKind?: 'big' | 'narration'
}>()

const emit = defineEmits<{
  close: []
  save: [data: FlowNodeData]
  delete: []
}>()

const isStudent = computed(() => props.subType === 'student')
const isNarration = computed(() => props.nodeKind === 'narration')
const titleColor = computed(() =>
  isNarration.value ? '#722ed1' : isStudent.value ? '#1890ff' : '#fa8c16')
const titleText = computed(() =>
  isNarration.value ? '旁白节点设置' : isStudent.value ? '学员节点设置' : '陪练者节点设置')

const createLocal = (): LocalNodeData => ({
  nodeName: props.nodeData.nodeName || '',
  trainerQuestion: props.nodeData.trainerQuestion || '',
  standardScript: props.nodeData.standardScript || '',
  keyPoints: (props.nodeData.keyPoints || []).map((p) => ({ ...p })),
  analysis: props.nodeData.analysis || '',
  passCondition: {
    type: props.nodeData.passCondition?.type || 'normal',
    n: props.nodeData.passCondition?.n || 1,
    specifiedPointIds: [...(props.nodeData.passCondition?.specifiedPointIds || [])]
  }
})

/**
 * FlowNodeData 里 keyPoints / passCondition 是可选的（后端存量数据可能没有），
 * 但 createLocal 一律补齐了默认值，故本地草稿用收紧后的类型，模板不必每处写 `!`。
 */
type LocalNodeData = Omit<FlowNodeData, 'keyPoints' | 'passCondition'> &
  Required<Pick<FlowNodeData, 'keyPoints' | 'passCondition'>>

const localData = reactive<LocalNodeData>(createLocal())

watch(
  () => [props.nodeData, props.subType],
  () => Object.assign(localData, createLocal()),
  { deep: true }
)

const addKeypoint = () => {
  localData.keyPoints.push({ id: `kp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, content: '' })
}

const removeKeypoint = (index: number) => {
  const removed = localData.keyPoints[index]
  if (!removed) return
  localData.keyPoints.splice(index, 1)
  // 删掉的要点可能还勾在流转条件里，不清理会让条件指向不存在的要点
  localData.passCondition.specifiedPointIds = (localData.passCondition.specifiedPointIds || []).filter(
    (id) => id !== removed.id
  )
}

const handleSave = () => {
  emit('save', JSON.parse(JSON.stringify(localData)))
}
</script>

<style scoped lang="scss">
.config-panel {
  width: 340px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e8e8e8;

  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #333;

    .title-bar {
      width: 3px;
      height: 14px;
      border-radius: 2px;
    }
  }

  .close-btn {
    font-size: 22px;
    color: #999;
    cursor: pointer;
    line-height: 1;

    &:hover { color: #333; }

    // 图标关闭按钮：补键盘焦点环
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; }
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.form-item {
  margin-bottom: 18px;

  .form-label {
    display: block;
    font-size: 13px;
    color: #333;
    margin-bottom: 8px;

    &.required::after {
      content: ' *';
      color: #f5222d;
    }

    .label-tip {
      font-size: 12px;
      color: #999;
      font-weight: normal;
      margin-left: 4px;
    }
  }
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  font-family: inherit;

  &:focus { border-color: #1890ff; }
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #bbb;
  margin-top: 4px;
}

.keypoints-list {
  .keypoint-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .point-index {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #f0f0f0;
      color: #666;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .form-input { flex: 1; }
  }

  .btn-icon {
    width: 26px;
    height: 26px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    color: #999;
    flex-shrink: 0;

    &:hover { color: #f5222d; border-color: #f5222d; }
  }

  .btn-add {
    width: 100%;
    padding: 8px;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
    background: #fafafa;
    color: #1890ff;
    font-size: 13px;
    cursor: pointer;

    &:hover { border-color: #1890ff; background: #f0f9ff; }
  }
}

.condition-group {
  .condition-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 0;
    font-size: 13px;
    color: #333;
    cursor: pointer;

    .num-input {
      width: 56px;
      padding: 4px 6px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      font-size: 13px;
      text-align: center;
      outline: none;

      &:focus { border-color: #1890ff; }
      &:disabled { background: #f5f5f5; color: #bbb; }
    }
  }

  .specified-points {
    margin: 8px 0 0 22px;
    padding: 10px;
    background: #fafafa;
    border-radius: 6px;
    max-height: 180px;
    overflow-y: auto;

    .empty-tip {
      font-size: 12px;
      color: #999;
    }

    .point-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 12px;
      color: #333;
      cursor: pointer;

      span {
        min-width: 0; // flex 子项ellipsis截断必需，否则长要点名撑破勾选行
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;

  .footer-right {
    display: flex;
    gap: 12px;
  }
}

.btn {
  padding: 7px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #d9d9d9;

  &.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
  &.btn-default { background: #fff; color: #333; }
  &.btn-danger { background: #fff; color: #f5222d; border-color: #ffa39e; }
  &.btn-danger:hover { background: #fff1f0; }
  &:hover { opacity: 0.88; }
}
</style>
