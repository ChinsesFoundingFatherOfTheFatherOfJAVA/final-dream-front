<template>
  <div class="flow-design">
    <div class="alert-info">
      <span class="alert-icon" aria-hidden="true"><el-icon aria-hidden="true"><WarningFilled /></el-icon></span>
      <span>发布/提交前，请先检查下方「陪练者问学员答」和「学员问陪练者答」中学员说中的流转条件</span>
    </div>

    <div class="flow-toolbar">
      <span class="update-time">最近更新时间: {{ updateTime }}</span>
      <div class="toolbar-right">
        <el-button v-if="hasFlow" class="btn btn-text" @click="openAIDialog"><el-icon class="btn-caret"><MagicStick /></el-icon> AI生成话术</el-button>
        <el-button class="btn btn-text" @click="handleSave"><el-icon aria-hidden="true"><DocumentChecked /></el-icon> 保存</el-button>
      </div>
    </div>

    <div v-if="!hasFlow" class="flow-empty">
      <div class="empty-inner">
        <div class="empty-illustration" aria-hidden="true"><el-icon><Switch /></el-icon></div>
        <p class="empty-title">还没有设置模板流程</p>
        <p class="empty-desc">请选择一种方式开始创建模板流程</p>
        <div class="create-methods">
          <el-button class="method-btn" @click="openAIDialog">
            <span class="method-inner">
              <span class="method-icon" aria-hidden="true"><el-icon><MagicStick /></el-icon></span>
              <span class="method-label">AI生成话术</span>
              <span class="method-desc">输入对话场景，自动生成完整流程</span>
            </span>
          </el-button>
          <el-button class="method-btn" @click="createManualFlow">
            <span class="method-inner">
              <span class="method-icon" aria-hidden="true"><el-icon><EditPen /></el-icon></span>
              <span class="method-label">手动创建流程</span>
              <span class="method-desc">从空白画布开始，自由拖拽节点</span>
            </span>
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="flow-canvas-wrapper">
      <div class="node-panel">
        <div class="panel-title">可拖拽节点</div>
        <div class="node-list">
          <div class="node-item" v-for="item in nodePanelItems" :key="item.type" draggable="true" @dragstart="onDragStart($event, item.type)">
            <span class="node-dot" :style="{ background: item.color }"></span>
            <span class="node-name">{{ item.label }}</span>
          </div>
        </div>
        <div class="panel-tip">拖拽节点到右侧画布，拖动节点可移动，拖动节点上下圆点可连线</div>
      </div>

      <div class="canvas-area">
        <VueFlow
          ref="flowRef"
          v-model:nodes="flowNodes"
          v-model:edges="flowEdges"
          :default-viewport="{ x: 0, y: 0, zoom: 1 }"
          :min-zoom="0.2"
          :max-zoom="2"
          :snap-to-grid="true"
          :snap-grid="[15, 15]"
          :connection-mode="ConnectionMode.Strict"
          :connection-radius="40"
          :delete-key-code="['Delete', 'Backspace']"
          :elements-selectable="true"
          fit-view-on-init
          @connect="onConnect"
          @edge-click="onEdgeClick"
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
          @nodes-initialized="onNodesInitialized"
          @nodes-change="onNodesChange"
          @drop="onDrop"
          @dragover="onDragOver"
        >
          <Background :gap="20" :size="1.4" pattern-color="var(--color-rule-2)" />
          <Controls position="bottom-right" />
          <MiniMap pannable zoomable />
          <template #node-start="nodeProps">
            <StartEndNode v-bind="nodeProps" />
          </template>
          <template #node-end="nodeProps">
            <StartEndNode v-bind="nodeProps" />
          </template>
          <template #node-trainer_ask="nodeProps">
            <BigNode v-bind="nodeProps" />
          </template>
          <template #node-student_ask="nodeProps">
            <BigNode v-bind="nodeProps" />
          </template>
          <template #node-narration="nodeProps">
            <NarrationNode v-bind="nodeProps" />
          </template>
        </VueFlow>
      </div>

      <NodeConfigPanel
        v-if="selectedNodeConfig"
        :node-data="selectedNodeConfig.data"
        :sub-type="selectedNodeConfig.subType"
        :node-kind="selectedNodeConfig.nodeKind || 'big'"
        @close="selectedNodeConfig = null"
        @save="handleNodeSave"
        @delete="handleDeleteSelectedNode"
      />
    </div>

    <EdgeWeightDialog
      v-if="edgeDialog"
      :edge-id="edgeDialog.id"
      :current-weight="edgeDialog.weight || 1"
      :source-label="edgeDialog.sourceLabel"
      :target-label="edgeDialog.targetLabel"
      @close="edgeDialog = null"
      @confirm="handleEdgeWeightConfirm"
      @delete="handleDeleteEdge(edgeDialog.id)"
    />

    <AIGenScriptDialog
      v-if="showAIDialog"
      @close="showAIDialog = false"
      @imported="handleAIImported"
    />

    <TemplateImportDialog
      v-if="showTemplateDialog"
      @close="showTemplateDialog = false"
      @confirm="handleTemplateImport"
    />
  </div>
</template>

<script setup lang="ts">
import { MagicStick, WarningFilled, DocumentChecked, Switch, EditPen } from '@element-plus/icons-vue'
import { ref, onMounted, nextTick } from 'vue'
import { toast } from '@/utils/toast'
import { useRoute } from 'vue-router'
import { VueFlow, useVueFlow, ConnectionMode, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import BigNode from '@/components/business/nodes/BigNode.vue'
import NarrationNode from '@/components/business/nodes/NarrationNode.vue'
import StartEndNode from '@/components/business/nodes/StartEndNode.vue'
import NodeConfigPanel from '@/components/business/NodeConfigPanel.vue'
import EdgeWeightDialog from '@/components/business/EdgeWeightDialog.vue'
import AIGenScriptDialog from '@/components/business/AIGenScriptDialog.vue'
import TemplateImportDialog from '@/components/business/TemplateImportDialog.vue'
import type { FlowNodeData } from '@/types/speech'
import { getTemplateFlow, saveTemplateFlow } from '@/api/template'
import { toVfNode, toVfEdge, toBackendNode, toBackendEdge } from '@/utils/convert'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const route = useRoute()
const templateId = Number(route.params.id)
const { screenToFlowCoordinate, findNode, fitView, removeNodes, removeEdges } = useVueFlow()

const flowRef = ref()
const hasFlow = ref(false)
const flowNodes = ref<any[]>([])
const flowEdges = ref<any[]>([])
const selectedNodeConfig = ref<{ nodeId: string; subType: 'trainer' | 'student'; nodeKind?: 'big' | 'narration'; data: FlowNodeData } | null>(null)
const edgeDialog = ref<any>(null)
const showAIDialog = ref(false)
const showTemplateDialog = ref(false)
const updateTime = ref('2026-09-14 16:00')

let nodeSeq = 0
const genId = (prefix: string) => `${prefix}-${Date.now()}-${nodeSeq++}`

const nodePanelItems = [
  { type: 'start', label: '开始', color: 'var(--color-success)' },
  { type: 'trainer_ask', label: '陪练者问学员说', color: 'var(--color-warning)' },
  { type: 'student_ask', label: '学员问陪练者说', color: 'var(--color-accent)' },
  { type: 'narration', label: '旁白', color: 'var(--color-accent-deep)' },
  { type: 'end', label: '结束', color: 'var(--color-error)' }
]

const defaultData = (): FlowNodeData => ({
  nodeName: '',
  trainerQuestion: '',
  standardScript: '',
  keyPoints: [],
  analysis: '',
  passCondition: { type: 'normal', n: 1, specifiedPointIds: [] }
})

const BIG_NODE_STEP = 260

const buildBigNode = (id: string, type: 'trainer_ask' | 'student_ask', x: number, y: number, data: FlowNodeData) => ({
  id,
  type,
  position: { x, y },
  data: {
    ...data,
    backendId: null,
    nodeType: type,
    nodeTypeTitle: type === 'trainer_ask' ? '陪练者问学员说' : '学员问陪练者说',
    activeSubType: null
  }
})

const buildSimpleNode = (id: string, type: 'start' | 'end', x: number, y: number, deletable = true, backendId: number | null = null) => ({
  id,
  type,
  position: { x, y },
  deletable,
  data: { nodeType: type, label: type === 'start' ? '开始' : '结束', deletable, backendId }
})

const onNodeClick = ({ node, event }: any) => {
  const delBtn = (event?.target as HTMLElement)?.closest?.('.node-delete-btn')
  if (delBtn) {
    if (delBtn.getAttribute('data-deletable') === 'false') {
      toast.warn('开始和结束节点不可删除')
      return
    }
    handleDeleteNode(node.id)
    return
  }
  const nodeType = node?.data?.nodeType
  // v1.2 旁白节点：整节点点击即开面板（无 trainer/student 双气泡）
  if (nodeType === 'narration') {
    selectedNodeConfig.value = {
      nodeId: node.id,
      subType: 'trainer',
      nodeKind: 'narration',
      data: JSON.parse(JSON.stringify({ ...node.data, narration: node.data.narration || '' }))
    }
    return
  }
  if (nodeType !== 'trainer_ask' && nodeType !== 'student_ask') return
  const target = (event?.target as HTMLElement)?.closest?.('[data-sub]') as HTMLElement | null
  if (!target) return
  const subType = target.getAttribute('data-sub') as 'trainer' | 'student'
  if (!subType) return
  flowNodes.value.forEach((n: any) => {
    if (n.type !== 'trainer_ask' && n.type !== 'student_ask') return
    const storeNode: any = findNode(n.id)
    const targetNode = storeNode || n
    if (!targetNode.data) targetNode.data = {}
    targetNode.data.activeSubType = n.id === node.id ? subType : null
  })
  selectedNodeConfig.value = {
    nodeId: node.id,
    subType,
    data: JSON.parse(JSON.stringify(node.data))
  }
}

const onPaneClick = () => {
  selectedNodeConfig.value = null
  flowNodes.value.forEach((n: any) => {
    if (n.type === 'trainer_ask' || n.type === 'student_ask') n.data.activeSubType = null
  })
}

const onNodesChange = () => {
  const id = selectedNodeConfig.value?.nodeId
  if (id && !findNode(id)) selectedNodeConfig.value = null
}

const handleDeleteNode = (nodeId: string) => {
  const node: any = findNode(nodeId)
  if (node && node.deletable === false) {
    toast.warn('开始和结束节点不可删除')
    return
  }
  removeNodes(nodeId)
  if (selectedNodeConfig.value?.nodeId === nodeId) selectedNodeConfig.value = null
}

const handleDeleteSelectedNode = () => {
  if (!selectedNodeConfig.value) return
  handleDeleteNode(selectedNodeConfig.value.nodeId)
}

const handleDeleteEdge = (edgeId: string) => {
  removeEdges(edgeId)
  edgeDialog.value = null
}

const onDragStart = (event: DragEvent, type: string) => {
  event.dataTransfer?.setData('application/vueflow', type)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}
const onDrop = (event: DragEvent) => {
  event.preventDefault()
  const type = event.dataTransfer?.getData('application/vueflow')
  if (!type) return
  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const x = position.x - 130
  const y = position.y - 40
  if (type === 'start' || type === 'end') {
    flowNodes.value.push(buildSimpleNode(genId(type), type as 'start' | 'end', x, y))
  } else if (type === 'narration') {
    // v1.2 旁白节点：可拖入任意位置（含中途场景转换提示）
    flowNodes.value.push({
      id: genId('narration'),
      type: 'narration',
      position: { x, y },
      deletable: true,
      data: { nodeType: 'narration', nodeTypeTitle: '旁白', label: '旁白', narration: '', deletable: true, backendId: null }
    })
  } else {
    flowNodes.value.push(buildBigNode(genId('big'), type as 'trainer_ask' | 'student_ask', x, y, defaultData()))
  }
}

const onConnect = (params: any) => {
  const sourceNode: any = findNode(params.source)
  const targetNode: any = findNode(params.target)
  const label = sourceNode?.data?.nodeTypeTitle || '节点'
  flowEdges.value.push({
    id: genId('edge'),
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    type: 'smoothstep',
    animated: true,
    label: '1',
    weight: 1,
    markerEnd: MarkerType.ArrowClosed,
    style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
    data: { weight: 1, sourceLabel: label, targetLabel: targetNode?.data?.nodeTypeTitle || '节点' }
  })
}

const onEdgeClick = ({ edge }: any) => {
  const sourceNode: any = findNode(edge.source)
  const targetNode: any = findNode(edge.target)
  edgeDialog.value = {
    id: edge.id,
    weight: edge.weight || edge.data?.weight || 1,
    sourceLabel: sourceNode?.data?.nodeName || sourceNode?.data?.nodeTypeTitle || '上游节点',
    targetLabel: targetNode?.data?.nodeName || targetNode?.data?.nodeTypeTitle || '下游节点'
  }
}

const handleEdgeWeightConfirm = (edgeId: string, weight: number) => {
  const edge = flowEdges.value.find((e) => e.id === edgeId)
  if (edge) {
    edge.weight = weight
    edge.label = String(weight)
    edge.data = { ...(edge.data || {}), weight }
  }
  edgeDialog.value = null
}

const handleNodeSave = (newData: FlowNodeData) => {
  if (!selectedNodeConfig.value) return
  const node: any = findNode(selectedNodeConfig.value.nodeId)
  if (node) {
    const activeSubType = node.data.activeSubType
    node.data = {
      ...node.data,
      nodeName: newData.nodeName,
      narration: newData.narration, // v1.2 旁白节点编辑回写（此前漏传致保存丢失）
      trainerQuestion: newData.trainerQuestion,
      standardScript: newData.standardScript,
      keyPoints: newData.keyPoints,
      analysis: newData.analysis,
      passCondition: newData.passCondition,
      activeSubType
    }
  }
  selectedNodeConfig.value = null
  flowNodes.value.forEach((n) => {
    if (n.type === 'trainer_ask' || n.type === 'student_ask') n.data.activeSubType = null
  })
}

const handleSave = async () => {
  const idMap: Record<string, number> = {}
  flowNodes.value.forEach((n: any, i: number) => { idMap[n.id] = i + 1 })
  const backendNodes = flowNodes.value.map((n: any, i: number) => toBackendNode(n, i + 1))
  const backendEdges = flowEdges.value.map((e: any) => toBackendEdge(e, idMap))
  try {
    await saveTemplateFlow(templateId, { nodes: backendNodes, edges: backendEdges })
    toast.success('模板流程已保存')
    loadFlow()
  } catch { /* handled */ }
}

const openAIDialog = () => {
  showAIDialog.value = true
}

const handleAIImported = (backendNodes: any[], backendEdges: any[]) => {
  // v2.0 三步向导导入：后端 import-script 已编排好 nodes/edges（同旧 generate-script 响应结构）
  const tempIds = backendNodes.map((n: any, i: number) => (n.id != null ? n.id : i + 1))
  const nodes = backendNodes.map((n: any, i: number) => toVfNode({ ...n, id: tempIds[i] }))
  const edges = backendEdges.map((e: any, i: number) => toVfEdge({
    id: e.id ?? `ai-${i}`,
    sourceNodeId: tempIds[e.source],
    targetNodeId: tempIds[e.target],
    weight: e.weight
  }))
  flowNodes.value = nodes
  flowEdges.value = edges
  hasFlow.value = true
  showAIDialog.value = false
  nextTick(() => setTimeout(() => fitView({ padding: 0.25, duration: 200 }), 80))
}

const handleTemplateImport = (_templateId: number, backendNodes: any[], backendEdges: any[]) => {
  const nodes = backendNodes.map((n: any, i: number) => { n.id = n.id || (i + 1); return toVfNode(n) })
  const edges = backendEdges.map((e: any) => toVfEdge(e))
  flowNodes.value = nodes
  flowEdges.value = edges
  hasFlow.value = true
  showTemplateDialog.value = false
  nextTick(() => setTimeout(() => fitView({ padding: 0.25, duration: 200 }), 80))
}

const createManualFlow = () => {
  const start = buildSimpleNode(genId('start'), 'start', 300, 0, false)
  const end = buildSimpleNode(genId('end'), 'end', 300, BIG_NODE_STEP + 80, false)
  flowNodes.value = [start, end]
  flowEdges.value = []
  flowEdges.value.push({
    id: genId('edge'),
    source: start.id,
    target: end.id,
    type: 'smoothstep',
    animated: true,
    label: '1',
    weight: 1,
    markerEnd: MarkerType.ArrowClosed,
    style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
    data: { weight: 1 }
  })
  hasFlow.value = true
  setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 60)
}

let fitted = false
const onNodesInitialized = async () => {
  await nextTick()
  if (!fitted) {
    fitted = true
  }
  setTimeout(() => fitView({ padding: 0.25, duration: 200 }), 50)
}

const loadFlow = async () => {
  if (!templateId) {
    hasFlow.value = false
    return
  }
  try {
    const res: any = await getTemplateFlow(templateId)
    const nodes = (res.nodes || []).map(toVfNode)
    const edges = (res.edges || []).map(toVfEdge)
    if (nodes.length === 0) {
      flowNodes.value = []
      flowEdges.value = []
      hasFlow.value = false
      return
    }
    flowNodes.value = nodes
    flowEdges.value = edges
    hasFlow.value = true
    await nextTick()
    setTimeout(() => fitView({ padding: 0.25, duration: 200 }), 80)
  } catch {
    hasFlow.value = false
  }
}

onMounted(() => {
  loadFlow()
})
</script>

<style scoped lang="scss">
.flow-design {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.alert-info {
  background: color-mix(in oklab, var(--color-warning) 12%, var(--color-paper));
  border: 1px solid color-mix(in oklab, var(--color-warning) 35%, var(--color-paper));
  border-radius: 4px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--color-warning);
}

.flow-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .update-time { font-size: 14px; color: var(--color-muted); }
  .toolbar-right { display: flex; gap: 8px; }
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, opacity 0.2s;
  border: 1px solid var(--color-rule-2);

  &.btn-text {
    background: var(--color-paper);
    color: var(--color-ink);
    border-color: var(--color-rule-2);
    &:hover { color: var(--color-accent); border-color: var(--color-accent); }
  }
  &:hover { opacity: 0.88; }
}

.flow-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-paper);
  border-radius: 8px;
}

.empty-inner {
  text-align: center;
  padding: 40px;

  .empty-illustration { font-size: 64px; margin-bottom: 16px; }
  .empty-title { font-size: 18px; font-weight: 600; color: var(--color-ink); margin: 0 0 8px 0; }
  .empty-desc { font-size: 14px; color: var(--color-muted); margin: 0 0 32px 0; }

  .create-methods { display: flex; gap: 20px; justify-content: center; }

  .method-btn {
    width: 220px;
    // el-button 默认固定 32px 高，卡片式内容不放开高度会整体溢出、文字互相叠压
    height: auto;
    padding: 24px 20px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;

    &:hover {
      border-color: var(--color-accent);
      box-shadow: 0 6px 18px color-mix(in oklab, var(--color-accent) 15%, transparent);
      transform: translateY(-3px);
    }

    // 卡片式纵向布局作用在自己的 method-inner 层上（带 scoped 属性，不依赖 el-button 内部结构）
    .method-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .method-icon { font-size: 30px; }
    .method-label { font-size: 15px; font-weight: 500; color: var(--color-ink); }
    .method-desc { font-size: 12px; color: var(--color-muted); line-height: 1.5; }
  }
}

.flow-canvas-wrapper {
  flex: 1;
  display: flex;
  background: var(--color-paper);
  border-radius: 8px;
  overflow: hidden;
  min-height: 520px;
}

.node-panel {
  width: 190px;
  border-right: 1px solid var(--color-rule);
  padding: 16px;
  flex-shrink: 0;
  background: var(--color-paper);

  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-ink);
    margin-bottom: 14px;
  }

  .panel-tip {
    margin-top: 18px;
    font-size: 12px;
    color: var(--color-rule-2);
    line-height: 1.6;
  }
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-paper-2);
  border: 1px solid var(--color-rule);
  border-radius: 6px;
  cursor: grab;
  font-size: 13px;
  color: var(--color-ink);
  user-select: none;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: var(--color-accent-wash);
    border-color: var(--color-accent-2);
  }

  &:active { cursor: grabbing; }

  .node-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}

.canvas-area {
  flex: 1;
  position: relative;
  min-width: 0;
}

.vue-flow__edge-path { stroke-width: 2; }
.vue-flow__edge { cursor: pointer; }
.vue-flow__edge:hover .vue-flow__edge-path { stroke: var(--color-accent) !important; stroke-width: 3 !important; }
.vue-flow__edge-text { font-size: 12px; fill: var(--color-accent); font-weight: 600; }
.vue-flow__edge-textbg { fill: var(--color-paper); }
.vue-flow__node { font-family: inherit; }
.vue-flow__minimap { border-radius: 6px; }

.btn-caret { vertical-align: -2px; margin-left: 2px; font-size: 12px; }
</style>
