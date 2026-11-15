<template>
  <div class="profile-tab">
    <p class="tab-desc">AI 角色类型即训练中的客户画像，决定演练对手的性格、关注点与沟通风格。</p>

    <div v-if="profiles.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true"><el-icon><UserFilled /></el-icon></div>
      <p class="empty-text">暂无客户画像，可在左侧对话中让助手生成</p>
    </div>

    <div v-for="p in profiles" :key="p.id" class="profile-card">
      <div class="profile-head">
        <span class="profile-type">{{ p.type }}</span>
      </div>
      <p v-if="p.description" class="profile-desc">{{ p.description }}</p>

      <div class="profile-grid">
        <div class="field">
          <div class="field-label">典型特征</div>
          <div v-if="p.personalities?.length" class="pill-cloud">
            <span v-for="(t, i) in p.personalities" :key="t" class="pill" :class="`pill-${i % 3}`">{{ t }}</span>
          </div>
          <span v-else class="field-empty">—</span>
        </div>

        <div class="field">
          <div class="field-label">决策关注点</div>
          <div v-if="p.decisionFactors?.length" class="pill-cloud">
            <span v-for="(t, i) in p.decisionFactors" :key="t" class="pill" :class="`pill-${i % 3}`">{{ t }}</span>
          </div>
          <span v-else class="field-empty">—</span>
        </div>

        <div class="field">
          <div class="field-label">沟通风格</div>
          <p class="field-text">{{ p.communicationStyle || '—' }}</p>
        </div>

        <div class="field">
          <div class="field-label">常见痛点</div>
          <ul v-if="p.painPoints?.length" class="field-list">
            <li v-for="t in p.painPoints" :key="t">{{ t }}</li>
          </ul>
          <span v-else class="field-empty">—</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssistantStore } from '../../composables/useAssistantStore'
import type { ArtifactCustomerProfile } from '@/types/assistant'
import { UserFilled } from '@element-plus/icons-vue'

const store = useAssistantStore()
const profiles = computed<ArtifactCustomerProfile[]>(() => store.artifactContent?.customerProfiles ?? [])
</script>

<style scoped lang="scss">
.tab-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 14px;
}

.empty-state {
  padding: 50px 0;
  text-align: center;

  .empty-icon { font-size: 34px; margin-bottom: 10px; }
  .empty-text { font-size: 14px; color: var(--color-muted); margin: 0; }
}

.profile-card {
  border: 1px solid var(--color-rule);
  border-radius: 8px;
  padding: 13px 14px;
  margin-bottom: 10px;
  background: var(--color-paper);

  .profile-head {
    display: flex;
    align-items: center;
    gap: 8px;

    .profile-type {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-ink);
      background: var(--color-accent-wash);
      color: var(--color-accent);
      border-radius: 4px;
      padding: 2px 10px;
    }
  }

  .profile-desc {
    margin: 9px 0 0;
    font-size: 13px;
    color: var(--color-ink-2);
    line-height: 1.7;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 11px;
  }

  .field {
    background: var(--color-paper-2);
    border: 1px solid var(--color-paper-2);
    border-radius: 6px;
    padding: 9px 11px;

    .field-label {
      font-size: 12px;
      color: var(--color-muted);
      margin-bottom: 6px;
    }

    .field-text {
      font-size: 13px;
      color: var(--color-ink-2);
      margin: 0;
      line-height: 1.65;
    }

    .field-list {
      margin: 0;
      padding-left: 16px;

      li { font-size: 13px; color: var(--color-ink-2); line-height: 1.65; }
    }

    .field-empty { font-size: 13px; color: var(--color-muted); }
  }
}

.pill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .pill {
    padding: 2px 9px;
    border-radius: 10px;
    font-size: 12px;

    &.pill-0 { color: var(--color-accent); background: var(--color-accent-wash); }
    &.pill-1 { color: var(--color-accent); background: var(--color-accent-wash); }
    &.pill-2 { color: var(--color-accent); background: color-mix(in oklab, var(--color-accent) 10%, var(--color-paper)); }
  }
}
</style>