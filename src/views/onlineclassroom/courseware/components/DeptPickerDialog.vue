<template>
  <el-dialog
    :model-value="visible"
    title="选择所属部门"
    width="560px"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <div class="dialog-toolbar">
      <el-checkbox v-model="includeChildren">包含子部门</el-checkbox>
      <el-button link type="primary" @click="clear">全部部门</el-button>
    </div>
    <div class="tree-area">
      <DeptTree
        v-model="selectedId"
        mode="single"
        :data="deptData"
        :show-count="false"
        searchable
        search-placeholder="搜索部门名称"
      />
    </div>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DeptTree from '@/components/common/DeptTree.vue'
import { getKngDeptTree } from '@/api/kng'

interface TreeDepartment {
  deptId: string
  deptName: string
  deptPath: string
  parentPath: string | null
  userCount: number
}

const props = withDefaults(defineProps<{
  visible: boolean
  deptId: string
  hasChild: number
}>(), {
  deptId: '',
  hasChild: 1
})

const emit = defineEmits<{
  close: []
  confirm: [value: { deptId: string; hasChild: number }]
}>()

const selectedId = ref('')
const includeChildren = ref(true)
const deptData = ref<TreeDepartment[]>([])

function flatten(
  nodes: Array<{ id: string; name: string; children?: unknown[] }>,
  parentPath: string | null,
  result: TreeDepartment[]
) {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}_${node.id}` : node.id
    result.push({
      deptId: node.id,
      deptName: node.name,
      deptPath: path,
      parentPath,
      userCount: 0
    })
    flatten((node.children || []) as Array<{ id: string; name: string; children?: unknown[] }>, path, result)
  }
}

function clear() {
  selectedId.value = ''
}

function confirm() {
  emit('confirm', { deptId: selectedId.value, hasChild: includeChildren.value ? 1 : 0 })
}

function handleVisibleChange(visible: boolean) {
  if (!visible) emit('close')
}

watch(() => props.visible, async visible => {
  if (!visible) return
  selectedId.value = props.deptId
  includeChildren.value = props.hasChild === 1
  const result: TreeDepartment[] = []
  flatten(await getKngDeptTree(), null, result)
  deptData.value = result
}, { immediate: true })
</script>

<style scoped lang="scss">
.dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 0;
  color: #667085;
  font-size: 12px;

}

.tree-area {
  height: 390px;
  padding: 8px 12px;
  overflow: hidden;
}
</style>
