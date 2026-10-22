<template>
  <KngDrawer
    :visible="visible"
    title="批量创建子分类"
    :width="620"
    :z-index="3100"
    @close="emit('close')"
  >
    <div class="batch-form">
      <label class="form-row">
        <span>所属分类</span>
        <el-input :model-value="parentPath" readonly />
      </label>
      <label class="content-field">
        <span>分类内容</span>
        <el-input
          v-model="content"
          type="textarea"
          :rows="12"
          placeholder="分类名称1&#10; 子分类名称01&#10;分类名称2"
        />
      </label>
      <div class="tips">
        <p>1. 课程分类总层级最多支持 10 级，超出后无法创建成功。</p>
        <p>2. 每级子分类需与上级分类保持一个以上空格的缩进。</p>
        <p>3. 批量创建的分类，权限默认继承所属分类。</p>
        <p>4. 分类名称 50 字以内。</p>
      </div>
    </div>

    <template #footer>
      <el-button class="btn ghost" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" :disabled="saving" @click="submit">
        {{ saving ? '创建中...' : '确定' }}
      </el-button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import KngDrawer from '../components/KngDrawer.vue'
import { batchCreateKngCatalog } from '@/api/kng'
import { toast } from '@/utils/toast'

const props = withDefaults(defineProps<{
  visible: boolean
  parentId: string | null
  parentPath: string
}>(), {
  parentId: null,
  parentPath: '主课堂'
})

const emit = defineEmits<{
  close: []
  saved: []
}>()

const content = ref('')
const saving = ref(false)

const submit = async () => {
  if (!content.value.trim()) {
    toast.warn('请填写分类内容')
    return
  }
  saving.value = true
  try {
    const result = await batchCreateKngCatalog({
      parentId: props.parentId,
      content: content.value
    })
    toast.info(`已创建 ${result.count} 个分类`)
    content.value = ''
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.batch-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row,
.content-field {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 10px;
  color: #4d5568;
  font-size: 13px;

  :deep(.el-input__wrapper) {
    min-height: 36px;
    border-radius: 6px;
  }
}

.content-field {
  align-items: flex-start;

  :deep(.el-textarea__inner) {
    border-radius: 6px;
    font-family: inherit;
    line-height: 1.6;
  }
}

.tips {
  padding: 12px 14px;
  border-radius: 7px;
  background: #f8fafc;
  color: #7a8396;
  font-size: 12px;
  line-height: 1.7;

  p {
    margin: 0;
  }
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;

  &.ghost {
    border: 1px solid #d9deea;
    background: #fff;
    color: #596274;
  }

  &.primary {
    border: none;
    background: #e75487;
    color: #fff;
  }
}
</style>
