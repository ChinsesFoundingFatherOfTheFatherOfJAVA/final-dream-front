<template>
  <div class="file-viewer">
    <el-page-header class="head" @back="goBack">
      <template #content
        ><span class="title">{{ context?.name ?? '资料查看' }}</span></template
      >
    </el-page-header>

    <el-alert v-if="error" type="error" :title="error" :closable="false" />
    <div v-else-if="context" class="viewer-body viewer-list">
      <el-alert
        v-if="context.notice"
        type="info"
        :title="context.notice"
        :closable="false"
        class="notice"
      />
      <!-- 在线课堂材料：跳在线课堂 viewer（契约 11 §7） -->
      <el-empty
        v-if="context.renderMode === 'online_classroom'"
        description="该材料来自在线课堂，请到在线课堂查看"
      >
        <el-button type="primary" @click="openOnline">去在线课堂查看</el-button>
      </el-empty>

      <!-- PDF：内嵌浏览器查看器 -->
      <iframe
        v-else-if="context.renderMode === 'pdf' && context.viewerUrl"
        :src="viewerSrc"
        class="pdf-frame viewer-page"
        :title="context.name"
      />

      <!-- 文本回退：等宽阅读 -->
      <pre v-else class="text-reader">{{ textContent || '加载中…' }}</pre>

      <div class="actions">
        <el-button v-if="context.originalUrl" text type="primary" @click="download">
          下载原文件
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 材料查看（契约 11 §7）：renderMode 分流；URL 统一走鉴权流（不暴露磁盘路径）
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getMaterialViewerContext,
  getStudentProductProfile,
  type MaterialViewerContext,
} from '@/api/actStudent'
import { downloadBlob, saveBlob } from '@/api/request'

const route = useRoute()
const router = useRouter()
const context = ref<MaterialViewerContext | null>(null)
const textContent = ref('')
const error = ref('')
const materialId = computed(() => String(route.params.materialId))

// PDF iframe 同样走鉴权：直接 src 带 token 不行（iframe 不带 Authorization 头），
// 首期用 blob 下载后本地预览
const viewerSrc = ref('')

async function loadPdfBlob() {
  if (!context.value?.viewerUrl) return
  const blob = await downloadBlob(context.value.viewerUrl)
  viewerSrc.value = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
}

async function download() {
  if (!context.value?.originalUrl || !context.value.name) return
  const blob = await downloadBlob(context.value.originalUrl)
  saveBlob(blob, context.value.name)
}

function openOnline() {
  // 在线课堂 viewer 路由（kng 模块已有页面）
  const coursewareId = context.value?.sourceId
  if (coursewareId) {
    router.push(`/kng/courseware/${coursewareId}`)
  }
}

const goBack = () => router.back()

onMounted(async () => {
  try {
    context.value = await getMaterialViewerContext(materialId.value)
    if (context.value.renderMode === 'pdf') {
      await loadPdfBlob()
    } else if (context.value.textUrl) {
      const blob = await downloadBlob(context.value.textUrl)
      textContent.value = await blob.text()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  }
})
</script>

<style scoped lang="scss">
.file-viewer {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
}

// 原平台材料页只呈现预览内容；保留页头及其返回逻辑，但不占据预览布局。
.head {
  display: none;
}

.viewer-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0;
}

.notice {
  align-self: stretch;
  margin-bottom: 12px;
}

.pdf-frame {
  display: block;
  width: 793px;
  height: 446px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.text-reader {
  align-self: stretch;
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.8;
  background: var(--el-fill-color-lighter);
  padding: 16px;
  border-radius: 8px;
  max-height: 72vh;
  overflow-y: auto;
}

.actions {
  align-self: stretch;
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
