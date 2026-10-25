<template>
  <div class="data-analysis">
    <!-- 左侧场景单元菜单 -->
    <aside class="unit-menu">
      <div class="menu-title">场景单元</div>
      <div
        v-for="unit in units"
        :key="unit.id"
        class="menu-item"
        :class="{ active: unit.id === selectedUnitId }"
        role="button"
        tabindex="0"
        @keydown.enter.prevent="selectUnit(unit.id)"
        @click="selectUnit(unit.id)"
      >
        <span class="unit-idx">{{ String(unit.sortOrder).padStart(2, '0') }}</span>
        <span class="unit-name">{{ unit.unitName }}</span>
      </div>
    </aside>

    <!-- 右侧内容 -->
    <div class="analysis-content">
      <!-- 总体概览 -->
      <div class="panel">
        <div class="panel-title">总体概览 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
        <p class="panel-note">统计范围包含全部历史版本数据，每日次日更新</p>
        <div class="overview-cards">
          <div class="overview-card">
            <div class="ov-value">{{ data.overview.practiced }} / {{ data.overview.totalUser }}</div>
            <div class="ov-label">已练习学员 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
          </div>
          <div class="overview-card">
            <div class="ov-value">{{ data.overview.totalCount }} 次</div>
            <div class="ov-label">练习总次数 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
          </div>
          <div class="overview-card">
            <div class="ov-value">{{ data.overview.passRate }}%</div>
            <div class="ov-sub">通过 {{ data.overview.passCount }} / 参与 {{ data.overview.participantCount }}</div>
            <div class="ov-label">场景通过率 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
          </div>
        </div>
      </div>

      <!-- 统计范围 -->
      <div class="scope-row">
        <span class="scope-label">统计范围 <span class="info-icon" aria-hidden="true">ⓘ</span></span>
        <div class="segmented">
          <el-button
            v-for="opt in scopeOptions"
            :key="opt.value"
            class="seg-btn"
            :class="{ active: scope === opt.value }"
            @click="scope = opt.value"
          >{{ opt.label }}</el-button>
        </div>
      </div>

      <!-- 总分分布 -->
      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">总分分布 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
          <div class="avg-tag">均分 <span class="info-icon" aria-hidden="true">ⓘ</span> {{ dist.avg }} 分</div>
        </div>
        <div class="dist-rows">
          <div v-for="row in distRows" :key="row.range" class="dist-row">
            <span class="dist-range">{{ row.range }}</span>
            <div class="dist-bar-track">
              <div
                class="dist-bar"
                :class="{ empty: row.value === 0 }"
                :style="{ width: barWidth(row.value) }"
              ></div>
            </div>
            <span class="dist-value">{{ row.value }} {{ unitLabel }}</span>
            <span
              v-if="row.delta !== null && row.delta !== 0"
              class="dist-delta"
              :class="row.delta > 0 ? 'up' : 'down'"
            >{{ row.delta > 0 ? '+' : '' }}{{ row.delta }}</span>
          </div>
        </div>
      </div>

      <!-- 维度掌握情况 -->
      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">维度掌握情况 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
          <div class="avg-tag">共 {{ scope === 'all' ? data.overview.totalCount + ' 次记录' : data.overview.practiced + ' 人' }}</div>
        </div>
        <div class="mastery-legend">
          <span class="legend-item"><span class="legend-dot low"></span>&lt;70</span>
          <span class="legend-item"><span class="legend-dot mid"></span>70-89</span>
          <span class="legend-item"><span class="legend-dot high"></span>90-100</span>
        </div>
        <div v-for="dim in currentDimensions" :key="dim.id" class="mastery-row">
          <!-- 维度名称行始终展示（含无数据维度，均分显示 —） -->
          <div class="mastery-head">
            <span class="mastery-name">{{ dim.dimensionName }}</span>
            <span class="mastery-avg">{{ masteryOf(dim.dimensionName) ? `均分 ${masteryOf(dim.dimensionName)!.avg}` : '均分 —' }}</span>
          </div>
          <template v-if="masteryOf(dim.dimensionName)">
            <div class="mastery-bar">
              <div class="seg seg-low" :style="{ width: pct(masteryOf(dim.dimensionName)!.dist!.low) }"></div>
              <div class="seg seg-mid" :style="{ width: pct(masteryOf(dim.dimensionName)!.dist!.mid) }"></div>
              <div class="seg seg-high" :style="{ width: pct(masteryOf(dim.dimensionName)!.dist!.high) }"></div>
            </div>
            <div class="mastery-foot">
              <span>&lt;70 {{ masteryOf(dim.dimensionName)!.dist!.low }} {{ unitLabel }}</span>
              <span>70-89 {{ masteryOf(dim.dimensionName)!.dist!.mid }} {{ unitLabel }}</span>
              <span>90-100 {{ masteryOf(dim.dimensionName)!.dist!.high }} {{ unitLabel }}</span>
            </div>
          </template>
          <div v-else class="mastery-empty">该维度暂无练习数据</div>
        </div>
      </div>

      <!-- 维度掌握变化 -->
      <div class="panel">
        <div class="panel-title">维度掌握变化 <span class="info-icon" aria-hidden="true">ⓘ</span></div>
        <el-table :data="currentDimensions" row-key="id" class="change-table">
          <el-table-column prop="dimensionName" label="维度" min-width="140" />
          <el-table-column label="首次 → 最近" min-width="160">
            <template #default="{ row }">
              <template v-if="changeOf(row.dimensionName)">
                <span class="change-scores">
                  {{ changeOf(row.dimensionName)!.firstScore }} → {{ changeOf(row.dimensionName)!.lastScore }}
                </span>
              </template>
              <span v-else class="change-empty">该维度暂无练习数据</span>
            </template>
          </el-table-column>
          <el-table-column label="变化幅度" min-width="220">
            <template #default="{ row }">
              <template v-if="changeOf(row.dimensionName)">
                  <div v-if="changeOf(row.dimensionName)!.notSecondTime" class="not-second">未练第 2 次</div>
                  <div v-else class="change-bar-cell">
                    <div class="change-track">
                      <div
                        class="change-fill"
                        :class="changeOf(row.dimensionName)!.delta >= 0 ? 'up' : 'down'"
                        :style="{ width: Math.min(100, Math.abs(changeOf(row.dimensionName)!.delta) * 8) + '%' }"
                      ></div>
                    </div>
                    <span class="change-num" :class="changeOf(row.dimensionName)!.delta >= 0 ? 'up' : 'down'">
                      {{ changeOf(row.dimensionName)!.delta > 0 ? '+' : '' }}{{ changeOf(row.dimensionName)!.delta }}
                    </span>
                  </div>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ActScenarioUnit } from '@/types/actTheme'
import { getMockAnalysis } from './dataAnalysisMock'
import type { AnalysisScope, DimChange, DimMastery, ScopeDistribution } from './dataAnalysisMock'

const props = defineProps<{ units: ActScenarioUnit[] }>()

const ranges = ['<60', '60-69', '70-79', '80-89', '90-100']
const scopeOptions: { value: AnalysisScope; label: string }[] = [
  { value: 'last', label: '最近一次' },
  { value: 'first', label: '首次' },
  { value: 'all', label: '全部记录' }
]

const selectedUnitId = ref('')
const scope = ref<AnalysisScope>('last')

// 默认选中第 1 个；单元列表变化（版本回滚/保存）时保持选中或回退
watch(
  () => props.units,
  (units) => {
    if (units.length === 0) { selectedUnitId.value = ''; return }
    if (!units.some(u => u.id === selectedUnitId.value)) {
      selectedUnitId.value = units[0]?.id ?? ''
    }
  },
  { immediate: true }
)

const selectedUnit = computed(() => props.units.find(u => u.id === selectedUnitId.value) || null)

const data = computed(() => getMockAnalysis(selectedUnit.value?.sortOrder ?? 0))

const dist = computed<ScopeDistribution>(() => {
  const d = data.value.distribution
  return scope.value === 'first' ? d.first : scope.value === 'last' ? d.last : d.all
})

/** 当前口径的维度掌握数据（按维度名索引；null = 暂无数据） */
const masteryMap = computed<Record<string, DimMastery | null>>(() => {
  const m = data.value.mastery
  return scope.value === 'first' ? m.first : scope.value === 'last' ? m.last : m.all
})

/** 全部记录口径 → 百分比；首次/最近一次 → 人 */
const unitLabel = computed(() => (scope.value === 'all' ? '%' : '人'))

const currentDimensions = computed(() =>
  selectedUnit.value ? [...selectedUnit.value.dimensions].sort((a, b) => a.sortOrder - b.sortOrder) : []
)

/** 总分分布行数据（含与首次相比的增减标记） */
const distRows = computed(() =>
  dist.value.segments.map((v, i) => ({
    range: ranges[i] ?? '',
    value: v,
    delta: dist.value.deltas?.[i] ?? null
  }))
)

const masteryOf = (name: string): DimMastery | null => masteryMap.value[name] ?? null
const changeOf = (name: string): DimChange | null => data.value.change[name] ?? null

/** 条形宽度：人按 max 归一，百分比直接用值 */
function barWidth(v: number): string {
  if (v <= 0) return '0%'
  if (scope.value === 'all') return `${Math.min(100, v)}%`
  const max = Math.max(...dist.value.segments, 1)
  return `${Math.max(4, (v / max) * 100)}%`
}

/** 掌握分布三段宽度：人按 max 归一，百分比直接按占比 */
function pct(v: number): string {
  if (scope.value === 'all') return `${v}%`
  const total = currentMaxDist()
  if (total <= 0) return '0%'
  return `${(v / total) * 100}%`
}

function currentMaxDist(): number {
  let max = 0
  for (const d of currentDimensions.value) {
    const m = masteryMap.value[d.dimensionName]
    if (m?.dist) max = Math.max(max, m.dist.low + m.dist.mid + m.dist.high)
  }
  return max
}

const selectUnit = (id: string) => {
  selectedUnitId.value = id
}
</script>

<style scoped lang="scss">
.data-analysis {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.unit-menu {
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: sticky;
  top: 0;

  .menu-title {
    padding: 14px 16px 10px;
    font-size: 15px;
    font-weight: 600;
    color: #1f2329;
    border-bottom: 1px solid #f2f3f5;
  }

  .menu-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    font-size: 14px;
    color: #4e5969;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    line-height: 1.5;

    .unit-idx {
      color: #a5a9b0;
      flex-shrink: 0;
    }

    &:hover { background: #f5f7fa; }
    &.active { background: #e6f7ff; color: #1890ff; .unit-idx { color: #1890ff; } }
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: -2px; }
  }
}

.analysis-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 18px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;

  .info-icon { font-size: 13px; color: #c9cdd4; font-weight: 400; }
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;

  .panel-title { margin-bottom: 0; }
}

.panel-note {
  font-size: 13px;
  color: #a5a9b0;
  margin: 4px 0 14px;
}

.avg-tag {
  font-size: 14px;
  color: #4e5969;

  .info-icon { font-size: 13px; color: #c9cdd4; }
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.overview-card {
  background: #f5f6f8;
  border-radius: 8px;
  padding: 14px 16px;

  .ov-value { font-size: 24px; font-weight: 600; color: #1f2329; }
  .ov-sub { font-size: 13px; color: #8a8f98; margin-top: 2px; }
  .ov-label { font-size: 13px; color: #8a8f98; margin-top: 6px; .info-icon { color: #c9cdd4; } }
}

.scope-row {
  display: flex;
  align-items: center;
  gap: 14px;

  .scope-label {
    font-size: 14px;
    color: #4e5969;
    .info-icon { color: #c9cdd4; }
  }
}

.segmented {
  display: inline-flex;
  background: #f2f3f5;
  border-radius: 6px;
  padding: 3px;

  .seg-btn {
    padding: 5px 16px;
    border: none;
    border-radius: 4px;
    background: transparent;
    font-size: 14px;
    color: #4e5969;
    cursor: pointer;
    transition: background 0.2s, color 0.2s, box-shadow 0.2s;

    &.active { background: #fff; color: #1890ff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
  }
}

.dist-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 12px;

  .dist-range { width: 56px; font-size: 13px; color: #646a73; text-align: right; }

  .dist-bar-track {
    flex: 1;
    height: 14px;
    background: #f2f3f5;
    border-radius: 3px;
    overflow: hidden;

    .dist-bar {
      height: 100%;
      background: #4f6ef7;
      border-radius: 3px;
      transition: width 0.3s;

      &.empty { background: #f2f3f5; }
    }
  }

  .dist-value { width: 64px; font-size: 13px; color: #4e5969; }

  .dist-delta {
    font-size: 12px;
    padding: 0 6px;
    border-radius: 8px;

    &.up { color: #52c41a; background: #f0fbe8; }
    &.down { color: #e5484d; background: #fdecec; }
  }
}

.mastery-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: #8a8f98;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;

    &.low { background: #f2745f; }
    &.mid { background: #4f6ef7; }
    &.high { background: #5ac26a; }
  }
}

.mastery-row {
  padding: 10px 0;
  border-bottom: 1px dashed #f2f3f5;

  &:last-child { border-bottom: none; }

  .mastery-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;

    .mastery-name { font-size: 14px; font-weight: 500; color: #1f2329; }
    .mastery-avg { font-size: 13px; color: #8a8f98; }
  }

  .mastery-bar {
    display: flex;
    height: 16px;
    border-radius: 3px;
    overflow: hidden;

    .seg { height: 100%; transition: width 0.3s; }
    .seg-low { background: #f2745f; }
    .seg-mid { background: #4f6ef7; }
    .seg-high { background: #5ac26a; }
  }

  .mastery-foot {
    display: flex;
    gap: 20px;
    margin-top: 5px;
    font-size: 12px;
    color: #a5a9b0;
  }

  .mastery-empty {
    text-align: center;
    font-size: 13px;
    color: #bbb;
    padding: 6px 0;
  }
}

.change-table {
  width: 100%;
  border-collapse: collapse;

  th {
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #646a73;
    text-align: left;
    background: #f7f8fa;
    border-bottom: 1px solid #ebeef2;
  }

  td {
    padding: 12px 14px;
    font-size: 14px;
    color: #4e5969;
    border-bottom: 1px solid #f2f3f5;
  }

  tr:last-child td { border-bottom: none; }

  .change-scores { white-space: nowrap; }

  .not-second {
    display: inline-block;
    padding: 1px 10px;
    border-radius: 4px;
    font-size: 13px;
    color: #8a8f98;
    background: #f2f3f5;
    white-space: nowrap;
  }

  .change-empty { color: #bbb; }

  .change-bar-cell {
    display: flex;
    align-items: center;
    gap: 10px;

    .change-track {
      flex: 1;
      height: 8px;
      background: #f2f3f5;
      border-radius: 4px;
      overflow: hidden;
      min-width: 120px;

      .change-fill {
        height: 100%;
        border-radius: 4px;

        &.up { background: #5ac26a; }
        &.down { background: #f2745f; }
      }
    }

    .change-num {
      font-size: 13px;
      white-space: nowrap;

      &.up { color: #52c41a; }
      &.down { color: #e5484d; }
    }
  }
}
</style>
