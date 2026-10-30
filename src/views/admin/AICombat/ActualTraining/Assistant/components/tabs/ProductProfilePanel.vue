<template>
  <div class="product-profile-panel">
    <p class="tab-desc">
      产品档案是学员对练时可查阅的产品资料（稳定
      profileKey，编辑不影响已发布内容；确认后随版本发布）。
    </p>

    <div class="toolbar">
      <el-button type="primary" size="small" :disabled="disabled" @click="openEditor(null)">
        新建档案
      </el-button>
      <el-button size="small" :disabled="disabled" @click="generateVisible = true"
        >AI 生成候选</el-button
      >
      <el-button size="small" :disabled="disabled || !selectedKey" @click="openLink">
        关联到场景
      </el-button>
    </div>

    <div v-if="!profiles.length" class="empty-state">
      <div class="empty-icon" aria-hidden="true">📦</div>
      <p class="empty-text">暂无产品档案</p>
    </div>

    <!-- 列表：选中即高亮，供"关联到场景"使用 -->
    <div
      v-for="profile in profiles"
      :key="profile.id"
      class="profile-card"
      :class="{ selected: selectedKey === profile.profileKey }"
      role="button"
      tabindex="0"
      @click="selectedKey = profile.profileKey"
      @keydown.enter.prevent="selectedKey = profile.profileKey"
    >
      <div class="profile-head">
        <span class="name">{{ profile.profileName }}</span>
        <span class="key">{{ profile.profileKey }}</span>
        <span class="spacer" />
        <el-button text size="small" :disabled="disabled" @click.stop="openEditor(profile)"
          >编辑</el-button
        >
        <el-button
          text
          type="danger"
          size="small"
          :disabled="disabled"
          @click.stop="removeProfile(profile)"
        >
          删除
        </el-button>
      </div>
      <p class="category" v-if="profile.category">{{ profile.category }}</p>
      <p class="description" v-if="profile.description">{{ profile.description }}</p>
    </div>

    <!-- 编辑弹窗（字段 + Markdown + 自定义字段 JSON） -->
    <el-dialog
      v-model="editorVisible"
      :title="editingId ? '编辑产品档案' : '新建产品档案'"
      width="640px"
    >
      <el-form label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="editor.profileName" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="editor.category" maxlength="200" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editor.description" type="textarea" :rows="2" maxlength="2000" />
        </el-form-item>
        <el-form-item label="自定义字段">
          <el-input
            v-model="editor.customFieldsJson"
            type="textarea"
            :rows="3"
            placeholder='[{"key":"品牌","value":"杰克科技","sortOrder":1}]'
          />
        </el-form-item>
        <el-form-item label="详情正文">
          <el-input
            v-model="editor.detailMarkdown"
            type="textarea"
            :rows="8"
            placeholder="Markdown"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- AI 候选生成（§5.1：候选只返回，编辑后保存） -->
    <el-dialog v-model="generateVisible" title="AI 生成产品档案候选" width="560px">
      <el-form label-width="90px">
        <el-form-item label="名称提示">
          <el-input v-model="generateForm.profileNameHint" placeholder="如：成套智联2.0" />
        </el-form-item>
        <el-form-item label="生成要求">
          <el-input v-model="generateForm.instructions" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="字段名">
          <el-input
            v-model="generateForm.customFieldKeys"
            placeholder="逗号分隔，如：品牌,产品状态,核心价值"
          />
        </el-form-item>
      </el-form>
      <div v-if="candidates.length" class="candidate-list">
        <el-card
          v-for="(candidate, index) in candidates"
          :key="index"
          shadow="never"
          class="candidate"
        >
          <div class="candidate-head">
            <strong>{{ candidate.profileName }}</strong>
            <el-button size="small" text type="primary" @click="useCandidate(candidate)"
              >采用并编辑</el-button
            >
          </div>
          <p class="candidate-desc">{{ candidate.description }}</p>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="generateVisible = false">关闭</el-button>
        <el-button type="primary" :loading="generating" @click="generate">生成候选</el-button>
      </template>
    </el-dialog>

    <!-- 场景关联：选场景 + 覆盖式 keys -->
    <el-dialog v-model="linkVisible" title="关联到场景" width="480px">
      <el-form label-width="90px">
        <el-form-item label="场景">
          <el-select v-model="linkScenarioId" placeholder="选择场景" style="width: 100%">
            <el-option
              v-for="unit in units"
              :key="unit.id"
              :label="unit.unitName"
              :value="unit.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="档案">
          <span>{{ selectedKey }}</span>
          <div class="link-hint">覆盖式保存：保存后该场景仅关联此处勾选的档案</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!linkScenarioId" @click="saveLink">保存关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 产品档案面板（契约 09 §4.4/§5.1）：工作区 v0 编辑，AI 候选只返回不落库
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createProductProfile,
  deleteProductProfile,
  generateProfileCandidates,
  linkScenarioProfiles,
  listProductProfiles,
  type ProductProfile,
  type ProductProfileCandidate,
  updateProductProfile,
} from '@/api/actProductProfile'

const props = defineProps<{
  themeId: string
  disabled?: boolean
  scenarioUnits?: Array<{ id: string; unitName: string }>
}>()

const profiles = ref<ProductProfile[]>([])
const selectedKey = ref('')
const editorVisible = ref(false)
const editingId = ref('')
const saving = ref(false)
const editor = reactive({
  profileName: '',
  category: '',
  description: '',
  customFieldsJson: '',
  detailMarkdown: '',
})
const generateVisible = ref(false)
const generating = ref(false)
const generateForm = reactive({ profileNameHint: '', instructions: '', customFieldKeys: '' })
const candidates = ref<ProductProfileCandidate[]>([])
const linkVisible = ref(false)
const linkScenarioId = ref('')

const units = computed(() => props.scenarioUnits ?? [])

async function load() {
  profiles.value = await listProductProfiles(props.themeId)
}

function openEditor(profile: ProductProfile | null) {
  editingId.value = profile?.id ?? ''
  editor.profileName = profile?.profileName ?? ''
  editor.category = profile?.category ?? ''
  editor.description = profile?.description ?? ''
  editor.customFieldsJson = profile?.customFields ?? ''
  editor.detailMarkdown = profile?.detailMarkdown ?? ''
  editorVisible.value = true
}

async function saveProfile() {
  saving.value = true
  try {
    const body = {
      profileName: editor.profileName,
      category: editor.category || null,
      description: editor.description || null,
      detailMarkdown: editor.detailMarkdown || null,
      customFieldsJson: editor.customFieldsJson || null,
    }
    if (editingId.value) {
      await updateProductProfile(props.themeId, editingId.value, body)
    } else {
      await createProductProfile(props.themeId, body)
    }
    editorVisible.value = false
    ElMessage.success('已保存到工作区')
    load()
  } finally {
    saving.value = false
  }
}

async function removeProfile(profile: ProductProfile) {
  await ElMessageBox.confirm(
    `确定删除档案「${profile.profileName}」？被场景引用时将无法删除。`,
    '删除产品档案',
    { type: 'warning' },
  )
  await deleteProductProfile(props.themeId, profile.id)
  ElMessage.success('已删除')
  load()
}

async function generate() {
  generating.value = true
  try {
    const result = await generateProfileCandidates(props.themeId, {
      materialIds: [],
      profileNameHint: generateForm.profileNameHint || undefined,
      instructions: generateForm.instructions || undefined,
      customFieldKeys: generateForm.customFieldKeys
        ? generateForm.customFieldKeys
            .split(/[,，]/)
            .map((key) => key.trim())
            .filter(Boolean)
        : undefined,
    })
    candidates.value = result.candidates ?? []
    if (!candidates.value.length) {
      ElMessage.info('未生成候选，请补充材料或提示')
    }
  } finally {
    generating.value = false
  }
}

function useCandidate(candidate: ProductProfileCandidate) {
  editingId.value = ''
  editor.profileName = candidate.profileName
  editor.category = candidate.category ?? ''
  editor.description = candidate.description ?? ''
  editor.detailMarkdown = candidate.detailMarkdown ?? ''
  editor.customFieldsJson = candidate.customFields ? JSON.stringify(candidate.customFields) : ''
  generateVisible.value = false
  editorVisible.value = true
}

function openLink() {
  linkScenarioId.value = ''
  linkVisible.value = true
}

async function saveLink() {
  if (!selectedKey.value || !linkScenarioId.value) return
  await linkScenarioProfiles(props.themeId, linkScenarioId.value, [selectedKey.value])
  linkVisible.value = false
  ElMessage.success('关联已保存')
}

onMounted(load)
</script>

<style scoped lang="scss">
.product-profile-panel {
  .tab-desc {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    margin: 0 0 12px;
  }
  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .empty-state {
    text-align: center;
    padding: 24px;
    color: var(--el-text-color-secondary);
  }
  .profile-card {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color 0.15s ease;
    &.selected,
    &:hover {
      border-color: var(--el-color-primary);
    }
    .profile-head {
      display: flex;
      align-items: center;
      gap: 8px;
      .name {
        font-weight: 600;
      }
      .key {
        color: var(--el-text-color-secondary);
        font-size: 12px;
      }
      .spacer {
        flex: 1;
      }
    }
    .category,
    .description {
      margin: 6px 0 0;
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }
  .candidate-list {
    max-height: 300px;
    overflow-y: auto;
    .candidate {
      margin-bottom: 8px;
      .candidate-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .candidate-desc {
        margin: 6px 0 0;
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
  }
  .link-hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>
