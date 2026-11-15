<template>
  <div class="iceberg-tab">
    <p class="tab-desc">冰山模型：水面以上是可直接观察的知识与技能，水面以下决定行为表现的深层要素。</p>

    <!-- 水面以上 -->
    <section class="layer layer-visible">
      <div class="layer-head">
        <span class="layer-badge">水面以上</span>
        <span class="layer-sub">可观察 · 易培养</span>
      </div>
      <div class="layer-body">
        <div class="layer-field">
          <div class="field-label">知识</div>
          <div v-if="visible.knowledge?.length" class="pill-cloud">
            <span v-for="(t, i) in visible.knowledge" :key="t" class="pill pill-blue" :class="`shade-${i % 3}`">{{ t }}</span>
          </div>
          <span v-else class="field-empty">—</span>
        </div>
        <div class="layer-field">
          <div class="field-label">技能</div>
          <div v-if="visible.skills?.length" class="pill-cloud">
            <span v-for="(t, i) in visible.skills" :key="t" class="pill pill-green" :class="`shade-${i % 3}`">{{ t }}</span>
          </div>
          <span v-else class="field-empty">—</span>
        </div>
      </div>
    </section>

    <!-- 水面线 -->
    <div class="water-line">
      <span class="line"></span>
      <span class="line-label">水 面 线</span>
      <span class="line"></span>
    </div>

    <!-- 水面以下 -->
    <section class="layer layer-hidden">
      <div class="layer-head">
        <span class="layer-badge hidden">水面以下</span>
        <span class="layer-sub">深层驱动 · 需长期塑造</span>
      </div>
      <div class="layer-body hidden-body">
        <div v-for="f in hiddenFields" :key="f.key" class="layer-field">
          <div class="field-label">{{ f.label }}</div>
          <div v-if="f.items.length" class="pill-cloud">
            <span v-for="(t, i) in f.items" :key="t" class="pill pill-purple" :class="`shade-${i % 3}`">{{ t }}</span>
          </div>
          <span v-else class="field-empty">—</span>
        </div>
      </div>
    </section>

    <!-- 模型说明 -->
    <div class="model-note">
      <div class="note-title">模型说明</div>
      <p class="note-text">
        冰山模型把能力分为水面以上与水面以下两部分。知识与技能可以通过培训快速获得，
        而角色认知、自我概念、特质与动机会长期影响学员在真实客户面前的行为表现。
        训练主题会同时关联两层要素，评估维度也会覆盖深层能力，避免只在话术表层做优化。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssistantStore } from '../../composables/useAssistantStore'

const store = useAssistantStore()

const visible = computed(() => store.artifactContent?.icebergModel?.visible ?? { knowledge: [], skills: [] })
const hidden = computed(
  () => store.artifactContent?.icebergModel?.hidden ?? { roles: [], selfConcept: [], personalities: [], motives: [] }
)

/** 水面以下四层：角色 / 自我概念 / 特质 / 动机（schema 字段名为 roles/selfConcept/personalities/motives） */
const hiddenFields = computed(() => [
  { key: 'roles', label: '角色', items: hidden.value.roles ?? [] },
  { key: 'selfConcept', label: '自我概念', items: hidden.value.selfConcept ?? [] },
  { key: 'personalities', label: '特质', items: hidden.value.personalities ?? [] },
  { key: 'motives', label: '动机', items: hidden.value.motives ?? [] }
])
</script>

<style scoped lang="scss">
.tab-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 14px;
}

.layer {
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  overflow: hidden;

  &.layer-visible { background: var(--color-paper-2); border-color: var(--color-accent-wash); }
  &.layer-hidden { background: var(--color-accent-wash); border-color: var(--color-accent-wash); }
}

.layer-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in oklab, var(--color-graphite) 5%, transparent);

  .layer-badge {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-accent);
    background: var(--color-accent-wash);
    border-radius: 4px;
    padding: 2px 10px;

    &.hidden { color: var(--color-accent); background: var(--color-accent-wash); }
  }

  .layer-sub { font-size: 12px; color: var(--color-muted); }
}

.layer-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
}

.hidden-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.layer-field {
  .field-label {
    font-size: 12px;
    color: var(--color-muted);
    margin-bottom: 6px;
  }

  .field-empty { font-size: 13px; color: var(--color-muted); }
}

.pill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .pill {
    padding: 2px 10px;
    border-radius: 11px;
    font-size: 12px;
  }

  /* 水面以上：蓝/绿两族，按序微调深浅 */
  .pill-blue {
    &.shade-0 { color: var(--color-accent); background: var(--color-accent-wash); }
    &.shade-1 { color: var(--color-accent); background: var(--color-accent-wash); }
    &.shade-2 { color: var(--color-accent-deep); background: var(--color-accent-wash); }
  }

  .pill-green {
    &.shade-0 { color: var(--color-success); background: color-mix(in oklab, var(--color-success) 10%, var(--color-paper)); }
    &.shade-1 { color: var(--color-success); background: color-mix(in oklab, var(--color-success) 8%, var(--color-paper)); }
    &.shade-2 { color: var(--color-success); background: color-mix(in oklab, var(--color-success) 12%, var(--color-paper)); }
  }

  /* 水面以下：紫族 */
  .pill-purple {
    &.shade-0 { color: var(--color-accent); background: var(--color-accent-wash); }
    &.shade-1 { color: var(--color-accent); background: var(--color-accent-wash); }
    &.shade-2 { color: var(--color-accent-deep); background: var(--color-accent-wash); }
  }
}

/* 水面线 */
.water-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;

  .line {
    flex: 1;
    height: 0;
    border-top: 2px dashed var(--color-accent-2);
  }

  .line-label {
    font-size: 12px;
    color: var(--color-accent);
    letter-spacing: 2px;
    white-space: nowrap;
  }
}

.model-note {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--color-paper-2);
  border: 1px solid var(--color-paper-2);
  border-radius: 8px;

  .note-title { font-size: 13px; font-weight: 600; color: var(--color-ink); margin-bottom: 6px; }

  .note-text {
    margin: 0;
    font-size: 13px;
    color: var(--color-ink-2);
    line-height: 1.8;
  }
}
</style>