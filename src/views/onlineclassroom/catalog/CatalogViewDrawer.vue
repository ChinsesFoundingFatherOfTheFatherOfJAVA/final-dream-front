<template>
  <KngDrawer
    :visible="visible"
    title="查看分类"
    :width="620"
    :z-index="3050"
    @close="emit('close')"
  >
    <div v-if="detail" class="view-content">
      <section>
        <h4>基本信息</h4>
        <div class="info-row"><span>所属分类</span><strong>{{ detail.parentPath }}</strong></div>
        <div class="info-row"><span>创建人</span><strong>{{ creatorText }}</strong></div>
        <div class="info-row"><span>分类名称</span><strong>{{ detail.name }}</strong></div>
        <div class="info-row"><span>发布时间</span><strong>{{ detail.createTime?.slice(0, 10) || '--' }}</strong></div>
        <div class="info-row"><span>默认课程顺序</span><strong>{{ orderTypeText }}</strong></div>
        <div class="info-row"><span>前后缀设置</span><strong>{{ prefixText }}</strong></div>
      </section>
      <section>
        <h4>权限设置</h4>
        <div v-for="row in detail.permissions" :key="`${row.subjectType}:${row.subjectId}`" class="permission-view">
          <span>{{ row.subjectName }}</span>
          <strong>{{ permissionText(row.permCodes) }}</strong>
        </div>
      </section>
    </div>

    <template #footer>
      <button type="button" class="btn ghost" @click="emit('close')">关闭</button>
      <button type="button" class="btn primary" @click="edit">编辑</button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KngDrawer from '../components/KngDrawer.vue'
import { getKngCatalogDetail, type KngCatalogDetail } from '@/api/kng'

const props = defineProps<{
  visible: boolean
  catalogId: string
}>()

const emit = defineEmits<{
  close: []
  edit: [detail: KngCatalogDetail]
}>()

const detail = ref<KngCatalogDetail | null>(null)
const orderMap: Record<number, string> = {
  1: '发布时间',
  2: '更新时间',
  3: '名称',
  4: '学习人数'
}
const permissionMap: Record<number, string> = {
  1: '浏览',
  2: '允许下载课件',
  3: '分发',
  4: '维护',
  5: 'App缓存课件'
}

const creatorText = computed(() => {
  if (!detail.value?.createUser) return '--'
  return `${detail.value.createUser.name}/${detail.value.createUser.account}（创建人有该目录的所有权限）`
})
const orderTypeText = computed(() => orderMap[detail.value?.orderType ?? 1] ?? '--')
const prefixText = computed(() => {
  const item = detail.value
  if (!item) return '--'
  const parts: string[] = []
  if (item.prefixEnabled && item.prefixContent) parts.push(`前缀：${item.prefixContent}`)
  if (item.dateSuffixEnabled && item.dateSuffixFormat) parts.push(`日期后缀：${item.dateSuffixFormat}`)
  return parts.length ? parts.join(' / ') : '--'
})

const permissionText = (codes: number[]) =>
  codes.length ? codes.map(code => permissionMap[code]).filter(Boolean).join('/') : '--'

const load = async () => {
  detail.value = props.catalogId ? await getKngCatalogDetail(props.catalogId) : null
}

const edit = () => {
  if (detail.value) emit('edit', detail.value)
}

watch(() => [props.visible, props.catalogId], ([visible]) => {
  if (visible) void load()
}, { immediate: true })
</script>

<style scoped lang="scss">
.view-content {
  display: flex;
  flex-direction: column;
  gap: 24px;

  h4 {
    margin: 0 0 14px;
    color: #253047;
    font-size: 14px;
  }
}

.info-row,
.permission-view {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #eef1f6;
  color: #6f788a;
  font-size: 13px;

  strong {
    color: #394253;
    font-weight: 500;
    word-break: break-word;
  }
}

.permission-view span {
  color: #596274;
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
