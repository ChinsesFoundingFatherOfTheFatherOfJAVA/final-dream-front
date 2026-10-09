<template>
  <div class="flow-design">
    <div class="alert-info">
      <span class="alert-icon">⚠️</span>
      <span>发布/提交前，请先检查下方「陪练者问学员答」和「学员问陪练者答」中学员说中的流转条件</span>
    </div>

    <div class="flow-toolbar">
      <span class="update-time">最近更新时间: {{ updateTime }}</span>
      <div class="toolbar-right">
        <button v-if="hasFlow" class="btn btn-text" @click="openAIDialog">✨ AI生成话术</button>
        <button class="btn btn-text" @click="handleSave">💾 保存</button>
      </div>
    </div>

    <div v-if="!hasFlow" class="flow-empty">
      <div class="empty-inner">
        <div class="empty-illustration">🔀</div>
        <p class="empty-title">还没有设置模板流程</p>
        <p class="empty-desc">请选择一种方式开始创建模板流程</p>
        <div class="create-methods">
          <button class="method-btn" @click="openAIDialog">
            <span class="method-icon">✨</span>
            <span class="method-label">AI生成话术</span>
            <span class="method-desc">输入对话场景，自动生成完整流程</span>
          </button>
          <button class="method-btn" @click="createManualFlow">
            <span class="method-icon">✏️</span>
            <span class="method-label">手动创建流程</span>
            <span class="method-desc">从空白画布开始，自由拖拽节点</span>
          </button>
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
          <Background :gap="20" :size="1.4" pattern-color="#d9d9d9" />
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
  { type: 'start', label: '开始', color: '#52c41a' },
  { type: 'trainer_ask', label: '陪练者问学员说', color: '#fa8c16' },
  { type: 'student_ask', label: '学员问陪练者说', color: '#1890ff' },
  { type: 'narration', label: '旁白', color: '#722ed1' },
  { type: 'end', label: '结束', color: '#f5222d' }
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
    style: { stroke: '#1890ff', strokeWidth: 2 },
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
    style: { stroke: '#1890ff', strokeWidth: 2 },
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
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #d48806;
}

.flow-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .update-time { font-size: 14px; color: #999; }
  .toolbar-right { display: flex; gap: 8px; }
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d9d9d9;

  &.btn-text {
    background: #fff;
    color: #333;
    border-color: #d9d9d9;
    &:hover { color: #1890ff; border-color: #1890ff; }
  }
  &:hover { opacity: 0.88; }
}

.flow-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
}

.empty-inner {
  text-align: center;
  padding: 40px;

  .empty-illustration { font-size: 64px; margin-bottom: 16px; }
  .empty-title { font-size: 18px; font-weight: 600; color: #333; margin: 0 0 8px 0; }
  .empty-desc { font-size: 14px; color: #999; margin: 0 0 32px 0; }

  .create-methods { display: flex; gap: 20px; justify-content: center; }

  .method-btn {
    width: 220px;
    padding: 24px 20px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;

    &:hover {
      border-color: #1890ff;
      box-shadow: 0 6px 18px rgba(24, 144, 255, 0.15);
      transform: translateY(-3px);
    }

    .method-icon { font-size: 30px; }
    .method-label { font-size: 15px; font-weight: 500; color: #333; }
    .method-desc { font-size: 12px; color: #999; line-height: 1.5; }
  }
}

.flow-canvas-wrapper {
  flex: 1;
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  min-height: 520px;
}

.node-panel {
  width: 190px;
  border-right: 1px solid #e8e8e8;
  padding: 16px;
  flex-shrink: 0;
  background: #fff;

  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    margin-bottom: 14px;
  }

  .panel-tip {
    margin-top: 18px;
    font-size: 12px;
    color: #bbb;
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
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: grab;
  font-size: 13px;
  color: #333;
  user-select: none;
  transition: all 0.2s;

  &:hover {
    background: #e6f7ff;
    border-color: #91d5ff;
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
.vue-flow__edge:hover .vue-flow__edge-path { stroke: #1890ff !important; stroke-width: 3 !important; }
.vue-flow__edge-text { font-size: 12px; fill: #1890ff; font-weight: 600; }
.vue-flow__edge-textbg { fill: #fff; }
.vue-flow__node { font-family: inherit; }
.vue-flow__minimap { border-radius: 6px; }
</style>
