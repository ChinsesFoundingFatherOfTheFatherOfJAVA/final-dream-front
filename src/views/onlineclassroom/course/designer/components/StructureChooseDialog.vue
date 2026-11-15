<template>
  <!-- 截图20：创建首入"选择要创建的课程结构"弹窗（无章节/有章节两卡片 + 说明文案） -->
  <el-dialog
    :model-value="visible"
    width="660px"
    top="10vh"
    :show-close="false"
    :close-on-click-modal="false"
    append-to-body
    class="structure-dialog"
    @close="emit('close')"
  >
    <template #header>
      <div class="structure-heading">
        <h3>选择要创建的课程结构</h3>
        <p class="tip">选择后仍可在编辑中切换，切换后任务将保留</p>
      </div>
    </template>
    <div class="cards">
      <button type="button" class="card" @click="emit('choose', 0)">
        <span class="card-preview flat" aria-hidden="true">
          <span class="preview-icon"><el-icon><Document /></el-icon></span>
          <span class="preview-lines"><i /><i /><i /></span>
        </span>
        <span class="card-copy">
          <strong>无章节</strong>
          <span class="desc">学习任务较少时，可以使用无章节，所有任务将平铺展示</span>
        </span>
      </button>
      <button type="button" class="card" @click="emit('choose', 1)">
        <span class="card-preview chaptered" aria-hidden="true">
          <span class="chapter-lines"><i /><i /></span>
          <span class="preview-icon"><el-icon><Tickets /></el-icon></span>
          <span class="preview-lines"><i /><i /><i /></span>
        </span>
        <span class="card-copy">
          <strong>有章节</strong>
          <span class="desc">学习任务较多时，可以使用章节将任务组织分类，方便学员按章节进行学习</span>
        </span>
      </button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { Document, Tickets } from '@element-plus/icons-vue'

/**
 * 创建课程首入的结构选择弹窗（CS-08/截图20）。
 * 由设计器主页在 route query choose=1 时展示一次；选择后由主页设置 structureType
 * 并 PUT designer(publish=false) 落库，关闭后不再弹（主页用 router.replace 清掉 query）。
 */
defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  /** structureType：0 无章节 / 1 有章节 */
  choose: [structureType: number]
}>()
</script>

<style scoped lang="scss">
.structure-heading {
  h3 {
    margin: 0;
    color: var(--color-ink);
    font-size: 17px;
    text-align: center;
  }

  .tip {
    margin: 8px 0 0;
    color: var(--color-muted);
    font-size: 12px;
    text-align: center;
  }
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 22px;
}

.card {
  width: 100%;
  min-height: 112px;
  display: grid;
  grid-template-columns: 138px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 16px 22px;
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: 8px;
  background: var(--color-paper);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-wash);
    box-shadow: 0 8px 22px color-mix(in oklab, var(--color-accent) 14%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
}

.card-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;

  strong {
    color: var(--color-ink);
    font-size: 15px;
  }

  .desc {
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.65;
    text-align: left;
  }
}

.card-preview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 10px 12px;
  border-radius: 7px;
  background: var(--color-paper-2);
}

.preview-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 42px;
  flex: 0 0 34px;
  border-radius: 6px 6px 9px 6px;
  color: var(--color-accent-ink);
  font-size: 18px;
}

.flat .preview-icon {
  background: color-mix(in oklab, var(--color-accent) 62%, var(--color-graphite));
}

.chaptered .preview-icon {
  background: var(--color-accent-deep);
}

.preview-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;

  i {
    display: block;
    height: 6px;
    border-radius: 3px;
    background: var(--color-paper-3);
  }

  i:nth-child(2) {
    width: 82%;
  }

  i:nth-child(3) {
    width: 62%;
  }
}

.chapter-lines {
  position: absolute;
  left: 6px;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  i {
    display: block;
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: var(--color-accent);
  }
}
</style>
