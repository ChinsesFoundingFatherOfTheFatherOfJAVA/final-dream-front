<template>
  <teleport to="body">
    <div v-if="visible" class="dept-dialog-mask" @click.self="emit('close')">
      <section class="dept-dialog">
        <header>
          <h3>选择所属部门</h3>
          <button type="button" @click="emit('close')">×</button>
        </header>
        <div class="dialog-toolbar">
          <label>
            <input v-model="includeChildren" type="checkbox" />
            <span>包含子部门</span>
          </label>
          <button type="button" class="link-btn" @click="clear">全部部门</button>
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
        <footer>
          <button type="button" @click="emit('close')">取消</button>
          <button type="button" class="primary" @click="confirm">确定</button>
        </footer>
      </section>
    </div>
  </teleport>
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
.dept-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 4200;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.34);
}

.dept-dialog {
  width: 560px;
  max-width: calc(100vw - 32px);
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2);

  header {
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    border-bottom: 1px solid #e9edf4;

    h3 {
      margin: 0;
      color: #30384a;
      font-size: 16px;
    }

    button {
      border: none;
      background: transparent;
      color: #8b95a7;
      font-size: 24px;
      cursor: pointer;
    }
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid #e9edf4;

    button {
      height: 34px;
      padding: 0 18px;
      border: 1px solid #d9deea;
      border-radius: 5px;
      background: #fff;
      color: #4d5568;
      cursor: pointer;

      &.primary {
        border-color: #2e7cf6;
        background: #2e7cf6;
        color: #fff;
      }
    }
  }
}

.dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 0;
  color: #667085;
  font-size: 12px;

  label {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  input {
    accent-color: #2e7cf6;
  }
}

.link-btn {
  border: none;
  background: transparent;
  color: #2e7cf6;
  cursor: pointer;
}

.tree-area {
  height: 390px;
  padding: 8px 12px;
  overflow: hidden;
}
</style>
