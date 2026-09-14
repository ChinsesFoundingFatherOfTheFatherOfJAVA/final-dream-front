<template>
  <div class="flow-design">
    <!-- 提示信息 -->
    <div class="alert-info">
      <span class="alert-icon">⚠️</span>
      <span>发布/提交前，请先检查下方「陪练者问学员答」和「学员问陪练者答」中学员说中的流转条件，此设置影响训练的难易程度</span>
    </div>

    <!-- 操作栏 -->
    <div class="flow-toolbar">
      <span class="update-time">最近更新时间: 2026-06-01 14:08</span>
      <div class="toolbar-right">
        <button v-if="hasFlow" class="btn btn-text" @click="handleImportTemplate">📋 从话术模版中选择</button>
        <button v-if="hasFlow" class="btn btn-text" @click="openAIDialog">✨ AI生成话术</button>
        <button class="btn btn-text" @click="handleSave">💾 保存</button>
      </div>
    </div>

    <!-- 无流程时的空状态 -->
    <div v-if="!hasFlow" class="flow-empty">
      <div class="empty-inner">
        <div class="empty-illustration">🔀</div>
        <p class="empty-title">还没有设置训练流程</p>
        <p class="empty-desc">请选择一种方式开始创建你的话术训练流程</p>
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
          <button class="method-btn" @click="handleImportTemplate">
            <span class="method-icon">📋</span>
            <span class="method-label">选择话术模板</span>
            <span class="method-desc">复用已创建的话术模板流程</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 流程画布 -->
    <div v-else class="flow-canvas-wrapper">
      <!-- 左侧节点面板 -->
      <div class="node-panel">
        <div class="panel-title">可拖拽节点</div>
        <div class="node-list">
          <div
            class="node-item"
            v-for="item in nodePanelItems"
            :key="item.type"
            draggable="true"
            @dragstart="onDragStart($event, item.type)"
          >
            <span class="node-dot" :style="{ background: item.color }"></span>
            <span class="node-name">{{ item.label }}</span>
          </div>
        </div>
        <div class="panel-tip">拖拽节点到右侧画布，拖动节点可移动，拖动节点上下圆点可连线</div>
      </div>

      <!-- vue-flow 画布 -->
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
        </VueFlow>
      </div>

      <!-- 右侧配置面板 -->
      <NodeConfigPanel
        v-if="selectedNodeConfig"
        :node-data="selectedNodeConfig.data"
        :sub-type="selectedNodeConfig.subType"
        @close="selectedNodeConfig = null"
        @save="handleNodeSave"
        @delete="handleDeleteSelectedNode"
      />
    </div>

    <!-- 连线权重弹窗 -->
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

    <!-- AI生成弹窗 -->
    <AIGenerateDialog
      v-if="showAIDialog"
      :generating="aiGenerating"
      @close="showAIDialog = false"
      @generate="handleAIGenerate"
    />

    <!-- 选择话术模板弹窗 -->
    <TemplateImportDialog
      v-if="showTemplateDialog"
      @close="showTemplateDialog = false"
      @confirm="handleTemplateImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { VueFlow, useVueFlow, ConnectionMode, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import BigNode from '@/components/business/nodes/BigNode.vue'
import StartEndNode from '@/components/business/nodes/StartEndNode.vue'
import NodeConfigPanel from '@/components/business/NodeConfigPanel.vue'
import EdgeWeightDialog from '@/components/business/EdgeWeightDialog.vue'
import AIGenerateDialog from '@/components/business/AIGenerateDialog.vue'
import TemplateImportDialog from '@/components/business/TemplateImportDialog.vue'
import type { FlowNodeData } from '@/types/speech'
import { getProjectFlow, saveProjectFlow } from '@/api/flow'
import { generateScript } from '@/api/ai'
import { toVfNode, toVfEdge, toBackendNode, toBackendEdge } from '@/utils/convert'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const route = useRoute()
const projectId = Number(route.params.id)
const { screenToFlowCoordinate, findNode, findEdge, fitView, removeNodes, removeEdges } = useVueFlow()

const flowRef = ref()
const hasFlow = ref(true)
const flowNodes = ref<any[]>([])
const flowEdges = ref<any[]>([])

const selectedNodeConfig = ref<{ nodeId: string; subType: 'trainer' | 'student'; data: FlowNodeData } | null>(null)
const edgeDialog = ref<any>(null)
const showAIDialog = ref(false)
const showTemplateDialog = ref(false)
const aiGenerating = ref(false)

let nodeSeq = 0
const genId = (prefix: string) => `${prefix}-${Date.now()}-${nodeSeq++}`

const nodePanelItems = [
  { type: 'start', label: '开始', color: '#52c41a' },
  { type: 'trainer_ask', label: '陪练者问学员说', color: '#fa8c16' },
  { type: 'student_ask', label: '学员问陪练者说', color: '#1890ff' },
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

// 大节点高度约 200px，垂直间距 260
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

// 点击节点：删除按钮 或 大节点内的子节点
const onNodeClick = ({ node, event }: any) => {
  // 删除按钮（悬停在大节点右上角的 ×）
  const delBtn = (event?.target as HTMLElement)?.closest?.('.node-delete-btn') as HTMLElement | null
  if (delBtn) {
    if (delBtn.getAttribute('data-deletable') === 'false') {
      alert('开始和结束节点不可删除')
      return
    }
    handleDeleteNode(node.id)
    return
  }

  const nodeType = node?.data?.nodeType
  if (nodeType !== 'trainer_ask' && nodeType !== 'student_ask') return
  const target = (event?.target as HTMLElement)?.closest?.('[data-sub]') as HTMLElement | null
  if (!target) return
  const subType = target.getAttribute('data-sub') as 'trainer' | 'student'
  if (!subType) return

  // 通过 store 更新高亮态（vue-flow 内部持有解析后的节点副本）
  const allNodes = flowNodes.value
  allNodes.forEach((n: any) => {
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

// 空白处点击：关闭配置面板
const onPaneClick = () => {
  selectedNodeConfig.value = null
  flowNodes.value.forEach((n: any) => {
    if (n.type === 'trainer_ask' || n.type === 'student_ask') n.data.activeSubType = null
  })
}

// 节点被删除后同步关闭配置面板
const onNodesChange = () => {
  const id = selectedNodeConfig.value?.nodeId
  if (id && !findNode(id)) {
    selectedNodeConfig.value = null
  }
}

// 删除节点
const handleDeleteNode = (nodeId: string) => {
  const node: any = findNode(nodeId)
  if (node && node.deletable === false) {
    alert('开始和结束节点不可删除')
    return
  }
  removeNodes(nodeId)
  if (selectedNodeConfig.value?.nodeId === nodeId) {
    selectedNodeConfig.value = null
  }
}

// 删除当前配置面板对应的节点
const handleDeleteSelectedNode = () => {
  if (!selectedNodeConfig.value) return
  handleDeleteNode(selectedNodeConfig.value.nodeId)
}

// 删除连线
const handleDeleteEdge = (edgeId: string) => {
  removeEdges(edgeId)
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

// 拖拽
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
  } else {
    flowNodes.value.push(buildBigNode(genId('big'), type as 'trainer_ask' | 'student_ask', x, y, defaultData()))
  }
}

// 连线
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

// 连线点击
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

// 空状态下的创建方式
const createManualFlow = () => {
  const start = buildSimpleNode(genId('start'), 'start', 300, 0, false)
  const end = buildSimpleNode(genId('end'), 'end', 300, BIG_NODE_STEP + 80, false)
  flowNodes.value = [start, end]
  flowEdges.value = [
    {
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
    }
  ]
  hasFlow.value = true
  setTimeout(() => fitView({ padding: 0.2 }), 60)
}

const openAIDialog = () => {
  showAIDialog.value = true
}

const handleAIGenerate = async (scene: string, rounds: number) => {
  if (aiGenerating.value) return
  aiGenerating.value = true
  try {
    const res: any = await generateScript({ description: scene, rounds })
    const backendNodes = res.nodes || []
    const backendEdges = res.edges || []
    // 后端返回的节点需要补充id用于构建前端格式
    const nodes = backendNodes.map((n: any, i: number) => {
      n.id = n.id || (i + 1)
      return toVfNode(n)
    })
    const edges = backendEdges.map((e: any) => toVfEdge(e))
    flowNodes.value = nodes
    flowEdges.value = edges
    hasFlow.value = true
    showAIDialog.value = false
    await nextTick()
    setTimeout(() => fitView({ padding: 0.25, duration: 200 }), 80)
  } catch { /* handled */ }
  finally { aiGenerating.value = false }
}

const handleImportTemplate = () => {
  showTemplateDialog.value = true
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

const handleSave = async () => {
  // 给每个节点分配临时数字ID（1,2,3...），edges 引用同一套ID，后端会映射为真实ID
  const idMap: Record<string, number> = {}
  flowNodes.value.forEach((n: any, i: number) => {
    idMap[n.id] = i + 1
  })
  const backendNodes = flowNodes.value.map((n: any) => toBackendNode(n, idMap[n.id]))
  const backendEdges = flowEdges.value.map((e: any) => toBackendEdge(e, idMap))
  try {
    await saveProjectFlow(projectId, { nodes: backendNodes, edges: backendEdges })
    alert('流程已保存')
    loadFlow()
  } catch { /* handled */ }
}

// 从后端加载流程
const loadFlow = async () => {
  if (!projectId) {
    hasFlow.value = false
    return
  }
  try {
    const res: any = await getProjectFlow(projectId)
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

// 节点尺寸测量完成后自适应视图
let fitted = false
const onNodesInitialized = async () => {
  await nextTick()
  if (!fitted) {
    fitted = true
  }
  setTimeout(() => fitView({ padding: 0.25, duration: 200 }), 50)
}

// 初始化演示流程：一条清晰的垂直链
const initDemoFlow = () => {
  const nodes: any[] = []
  const edges: any[] = []

  const start = buildSimpleNode(genId('start'), 'start', 300, 0, false)
  nodes.push(start)

  const demos: Array<{ type: 'trainer_ask' | 'student_ask'; name: string; q: string; a: string; points: string[] }> = [
    {
      type: 'trainer_ask',
      name: '产品介绍开场',
      q: 'Ai10 缝纫机跟别的缝纫机有啥不一样？',
      a: 'Ai10 缝纫机是全球首个 AI 服装智造设备，具备无油设计与 AI 调机能力。',
      points: ['全球首个', 'AI服装智造', '无油设计']
    },
    {
      type: 'student_ask',
      name: '客户疑虑解答',
      q: '这 AI 调机大模型真能解决我老师傅难招的问题吗？',
      a: '是的，AI 调机大模型可自动完成参数调试，降低对熟练工的依赖。',
      points: ['自动调参', '降低依赖']
    },
    {
      type: 'trainer_ask',
      name: '价值塑造',
      q: 'Ai10 外观看着高级，但价格同样不低，值得吗？',
      a: 'Ai10 的长期价值显著：无油设计减少清洗成本，AI 调机提升人均产能。',
      points: ['长期价值', '降本增效']
    }
  ]

  let prevId = start.id
  demos.forEach((d, i) => {
    const data = defaultData()
    data.nodeName = d.name
    data.trainerQuestion = d.q
    data.standardScript = d.a
    data.keyPoints = d.points.map((p, idx) => ({ id: `kp-${i}-${idx}`, content: p }))
    data.analysis = '解析：此处需要先共情客户，再以数据与案例建立信任。'
    data.passCondition = { type: 'any_n', n: 2, specifiedPointIds: [] }
    const big = buildBigNode(genId('big'), d.type, 300, (i + 1) * BIG_NODE_STEP, data)
    nodes.push(big)
    edges.push({
      id: genId('edge'),
      source: prevId,
      target: big.id,
      type: 'smoothstep',
      animated: true,
      label: '1',
      weight: 1,
      markerEnd: MarkerType.ArrowClosed,
      style: { stroke: '#1890ff', strokeWidth: 2 },
      data: { weight: 1 }
    })
    prevId = big.id
  })

  const end = buildSimpleNode(genId('end'), 'end', 300, (demos.length + 1) * BIG_NODE_STEP, false)
  nodes.push(end)
  edges.push({
    id: genId('edge'),
    source: prevId,
    target: end.id,
    type: 'smoothstep',
    animated: true,
    label: '1',
    weight: 1,
    markerEnd: MarkerType.ArrowClosed,
    style: { stroke: '#1890ff', strokeWidth: 2 },
    data: { weight: 1 }
  })

  flowNodes.value = nodes
  flowEdges.value = edges
}

onMounted(() => {
  loadFlow()
})
</script>

<style lang="scss">
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

/* 空状态 */
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

  .create-methods {
    display: flex;
    gap: 20px;
    justify-content: center;
  }

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

/* 画布区域 */
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

/* vue-flow 样式微调 */
.vue-flow__edge-path {
  stroke-width: 2;
}

.vue-flow__edge {
  cursor: pointer;
}

.vue-flow__edge:hover .vue-flow__edge-path {
  stroke: #1890ff !important;
  stroke-width: 3 !important;
}

.vue-flow__edge-text {
  font-size: 12px;
  fill: #1890ff;
  font-weight: 600;
}

.vue-flow__edge-textbg {
  fill: #fff;
}

.vue-flow__node {
  font-family: inherit;
}

.vue-flow__minimap {
  border-radius: 6px;
}
</style>
