<template>
  <!-- 截图20：创建首入"选择要创建的课程结构"弹窗（无章节/有章节两卡片 + 说明文案） -->
  <el-dialog
    :model-value="visible"
    width="620px"
    :show-close="false"
    :close-on-click-modal="false"
    append-to-body
    @close="emit('close')"
  >
    <template #header>
      <div class="structure-heading">
        <h3>选择要创建的课程结构</h3>
        <p class="tip">选择后仍可在编辑中切换，切换后任务将保留</p>
      </div>
    </template>
    <div class="cards">
      <el-button class="card" @click="emit('choose', 0)">
        <span class="card-icon flat" aria-hidden="true">▤</span>
        <strong>无章节</strong>
        <span class="desc">任务平铺展示，适合内容较少、无需分章的课程</span>
      </el-button>
      <el-button class="card" @click="emit('choose', 1)">
        <span class="card-icon chaptered" aria-hidden="true">☰</span>
        <strong>有章节</strong>
        <span class="desc">按章节组织任务，自动创建"章节1"，适合体系化课程</span>
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
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
    color: #253047;
    font-size: 17px;
    text-align: center;
  }

  .tip {
    margin: 8px 0 0;
    color: #98a1b2;
    font-size: 12px;
    text-align: center;
  }
}

.cards {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 26px 18px 22px;
  border: 1px solid #e2e7f0;
  border-radius: 10px;
  background: #fbfcfe;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: #2e7cf6;
    box-shadow: 0 8px 22px rgba(46, 124, 246, 0.14);
  }

  strong {
    color: #30384a;
    font-size: 15px;
  }

  .desc {
    color: #8a92a5;
    font-size: 12px;
    line-height: 1.6;
    text-align: center;
  }
}

.card-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: #fff;
  font-size: 20px;

  &.flat {
    background: #27b788;
  }

  &.chaptered {
    background: #2e7cf6;
  }
}
</style>
