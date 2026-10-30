<template>
  <div class="data-analysis">
    <div class="analysis-layout">
    <div class="unit-nav-holder">
      <aside class="unit-menu">
        <div class="menu-title">场景单元</div>
        <div class="unit-nav-list">
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
        </div>
      </aside>
    </div>

    <div class="analysis-content">
      <div class="modebar">
        <el-button class="mode-tab active">训练数据</el-button>
        <el-button class="mode-tab">考核数据</el-button>
      </div>

      <div class="section-title">总体概览</div>
      <div class="overview-cards">
        <div class="overview-card">
          <div class="ov-value">{{ data.overview.practiced }} / {{ data.overview.totalUser }}</div>
          <div class="ov-label">已练习学员</div>
        </div>
        <div class="overview-card">
          <div class="ov-value">{{ data.overview.totalCount }} <i>次</i></div>
          <div class="ov-label">练习总次数</div>
        </div>
        <div class="overview-card">
          <div class="ov-value">{{ data.overview.passRate }}<i>%</i></div>
          <div class="ov-label">场景通过率</div>
        </div>
      </div>

      <div class="scope-row">
        <span class="scope-label">统计范围</span>
        <el-select v-model="scope" class="scope-select" aria-label="统计范围">
          <el-option v-for="opt in scopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <span class="scope-label">统计范围</span>
        <el-select v-model="scope" class="scope-select" aria-label="统计范围">
          <el-option v-for="opt in scopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">总分分布</div>
          <div class="avg-tag">均分 <b>{{ dist.avg }}</b> 分</div>
        </div>
        <div class="dist-rows">
          <div v-for="row in distRows" :key="row.range" class="dist-row">
            <span class="dist-range">{{ row.range }}</span>
            <div class="dist-bar-track">
              <div class="dist-bar" :style="{ width: barWidth(row.value) }"></div>
            </div>
            <span class="dist-value">{{ row.value }} {{ unitLabel }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">维度掌握情况</div>
          <div class="panel-sub">共 {{ scope === 'all' ? data.overview.totalCount + ' 次记录' : data.overview.practiced + ' 人' }}</div>
        </div>
        <div v-for="dim in currentDimensions" :key="dim.id" class="mastery-row">
          <div class="mastery-head">
            <span class="mastery-name">{{ dim.dimensionName }}</span>
            <span class="mastery-avg">{{ masteryOf(dim.dimensionName) ? `均分 ${masteryOf(dim.dimensionName)!.avg}` : '均分 —' }}</span>
          </div>
          <template v-if="masteryOf(dim.dimensionName)">
            <div class="mastery-bar">
              <div v-if="masteryOf(dim.dimensionName)!.dist!.low > 0" class="seg seg-low is-weak" :style="{ width: pct(masteryOf(dim.dimensionName)!.dist!.low) }"></div>
              <div v-if="masteryOf(dim.dimensionName)!.dist!.mid > 0" class="seg seg-mid is-mid" :style="{ width: pct(masteryOf(dim.dimensionName)!.dist!.mid) }"></div>
              <div v-if="masteryOf(dim.dimensionName)!.dist!.high > 0" class="seg seg-high is-good" :style="{ width: pct(masteryOf(dim.dimensionName)!.dist!.high) }"></div>
            </div>
            <div class="mastery-foot">
              <span class="mastery-band">
                <i class="band-dot low"></i><span class="band-range">&lt;70</span>
                <b class="band-val">{{ masteryOf(dim.dimensionName)!.dist!.low }} {{ unitLabel }}</b>
              </span>
              <span class="mastery-band">
                <i class="band-dot mid"></i><span class="band-range">70-89</span>
                <b class="band-val">{{ masteryOf(dim.dimensionName)!.dist!.mid }} {{ unitLabel }}</b>
              </span>
              <span class="mastery-band">
                <i class="band-dot high"></i><span class="band-range">90-100</span>
                <b class="band-val">{{ masteryOf(dim.dimensionName)!.dist!.high }} {{ unitLabel }}</b>
              </span>
            </div>
          </template>
          <div v-else class="mastery-empty">该维度暂无练习数据</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">维度掌握变化</div>
          <div class="cv-endpoint"><span>首次</span><span>→</span><span>最近一次</span></div>
        </div>
        <div class="change-head">
          <span class="change-name">维度</span>
          <span class="change-nums">首次 → 最近一次</span>
          <span class="change-track-head">变化幅度</span>
        </div>
        <div v-for="dim in currentDimensions" :key="dim.id" class="change-row">
          <span class="change-name">{{ dim.dimensionName }}</span>
          <span class="change-nums">
            <template v-if="changeOf(dim.dimensionName)">
              {{ changeOf(dim.dimensionName)!.firstScore }} → {{ changeOf(dim.dimensionName)!.lastScore }}
            </template>
            <span v-else>—</span>
          </span>
          <div class="change-track">
            <div
              v-if="changeOf(dim.dimensionName) && !changeOf(dim.dimensionName)!.notSecondTime"
              class="change-fill"
              :class="changeOf(dim.dimensionName)!.delta >= 0 ? 'up' : 'down'"
              :style="{ width: Math.min(100, Math.abs(changeOf(dim.dimensionName)!.delta) * 8) + '%' }"
            ></div>
          </div>
          <span class="change-delta" :class="changeOf(dim.dimensionName)?.delta ? (changeOf(dim.dimensionName)!.delta >= 0 ? 'up' : 'down') : ''">
            <template v-if="changeOf(dim.dimensionName) && !changeOf(dim.dimensionName)!.notSecondTime">
              {{ changeOf(dim.dimensionName)!.delta > 0 ? '+' : '' }}{{ changeOf(dim.dimensionName)!.delta }}
            </template>
            <template v-else>—</template>
          </span>
        </div>
      </div>
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
  display: block;
}

.analysis-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.unit-nav-holder {
  width: 240px;
  flex: 0 0 240px;
}

.unit-menu {
  box-sizing: border-box;
  display: block;
  width: 240px;
  padding: 14px 12px;
  background: #fff;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  position: sticky;
  top: 0;

  .menu-title {
    box-sizing: border-box;
    width: 214px;
    height: 36px;
    padding: 8px;
    font-size: 14px;
    line-height: 20px;
    color: #8c8c8c;
  }

  .unit-nav-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .menu-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    color: #595959;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    .unit-idx {
      width: 13px;
      flex: 0 0 13px;
      font-size: 12px;
      font-weight: 600;
      line-height: 20px;
      color: #8c8c8c;
    }

    .unit-name {
      min-width: 0;
      height: 20px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    &:hover { background: #f5f7fa; }
    &.active {
      height: 36px;
      min-height: 36px;
      font-weight: 600;
      background: #f0f6ff;
      color: #436bff;
      .unit-idx { color: #436bff; }
    }
    &:focus-visible { outline: 2px solid #436bff; outline-offset: -2px; }
  }
}

.analysis-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}

.modebar {
  display: flex;
  gap: 8px;
  height: 32px;

  .mode-tab {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 78px;
    height: 32px;
    padding: 4px 12px;
    margin: 0;
    border: 1px solid #e9e9e9;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    line-height: 22px;
    color: #595959;
    background: #fff;

    &.active {
      color: #fff;
      background: #436bff;
      border-color: #436bff;
    }
  }
}

.section-title {
  height: 24px;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: #262626;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  height: 82px;
}

.overview-card {
  box-sizing: border-box;
  height: 82px;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;

  .ov-value {
    height: 20px;
    font-size: 20px;
    font-weight: 700;
    line-height: 20px;
    color: #262626;

    i {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 14px;
      color: #757575;
    }
  }

  .ov-label {
    height: 22px;
    margin-top: 8px;
    font-size: 14px;
    line-height: 22px;
    color: #757575;
  }
}

.scope-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;

  .scope-label {
    height: 22px;
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    color: #262626;
  }

  .scope-select {
    width: 140px;
    height: 32px;
  }

  :deep(.scope-select .el-select__wrapper) {
    box-sizing: border-box;
    width: 140px;
    height: 32px;
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 22px;
    color: #595959;
    background: #fff;
    box-shadow: 0 0 0 1px #d9d9d9 inset;
  }
}

.panel {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 24px;
  margin-top: 0;
}

.panel-title {
  height: 24px;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: #262626;
}

.avg-tag,
.panel-sub {
  height: 22px;
  font-size: 14px;
  line-height: 22px;
  color: #595959;

  b {
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    color: #262626;
  }
}

.panel-sub { color: #8c8c8c; }

.dist-rows { margin-top: 16px; }

.dist-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 22px;
  margin-top: 0;

  & + & { margin-top: 12px; }

  .dist-range {
    width: 48px;
    flex: 0 0 48px;
    height: 22px;
    font-size: 14px;
    line-height: 22px;
    color: #595959;
  }

  .dist-bar-track {
    width: 787px;
    flex: 1 1 auto;
    min-width: 0;
    height: 12px;
    background: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;

    .dist-bar {
      height: 12px;
      background: #436bff;
      border-radius: 3px;
      transition: width 0.3s;
    }
  }

  .dist-value {
    width: 88px;
    flex: 0 0 88px;
    height: 22px;
    font-size: 14px;
    line-height: 22px;
    color: #757575;
  }
}

.mastery-row {
  display: block;
  width: 100%;
  margin-top: 16px;

  .mastery-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 22px;
    margin-top: 0;

    .mastery-name {
      font-size: 14px;
      font-weight: 600;
      line-height: 22px;
      color: #262626;
    }

    .mastery-avg {
      font-size: 14px;
      line-height: 22px;
      color: #757575;
    }
  }

  .mastery-bar {
    display: flex;
    width: 100%;
    height: 18px;
    margin-top: 8px;
    background: #f0f0f0;
    border-radius: 5px;
    overflow: hidden;

    .seg {
      height: 18px;
      font-size: 12px;
      font-weight: 700;
      line-height: 22px;
      color: #fff;
      transition: width 0.3s;
    }
    .seg-low { background: #f43f5e; }
    .seg-mid { background: #436bff; }
    .seg-high { background: #059669; }
  }

  .mastery-foot {
    display: flex;
    gap: 24px;
    width: 100%;
    height: 22px;
    margin-top: 8px;
  }

  .mastery-band {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 22px;
  }

  .band-dot {
    width: 9px;
    height: 9px;
    border-radius: 3px;

    &.low { background: #f43f5e; }
    &.mid { background: #436bff; }
    &.high { background: #059669; }
  }

  .band-range {
    font-size: 14px;
    line-height: 22px;
    color: #757575;
  }

  .band-val {
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
    color: #262626;
  }

  .mastery-empty {
    padding: 6px 0;
    text-align: center;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.cv-endpoint {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;
  font-size: 14px;
  color: #595959;
}

.change-head,
.change-row {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
}

.change-head {
  width: calc(100% + 16px);
  height: 36px;
  padding: 7px 8px;
  margin: 8px 0 0 -8px;
  background: #fafafa;
  border-radius: 6px;
}

.change-row {
  width: 100%;
  padding: 9px;
}

.change-name {
  width: 140px;
  flex: 0 0 140px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #262626;
}

.change-nums {
  width: 108px;
  flex: 0 0 108px;
  font-size: 14px;
  line-height: 22px;
  color: #757575;
}

.change-head .change-name {
  color: #595959;
}

.change-head .change-nums {
  font-weight: 600;
  color: #595959;
}

.change-track-head {
  width: 683px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #595959;
}

.change-track {
  flex: 1;
  min-width: 0;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;

  .change-fill {
    height: 100%;
    border-radius: 4px;
    &.up { background: #059669; }
    &.down { background: #f43f5e; }
  }
}

.change-delta {
  width: 72px;
  flex: 0 0 72px;
  height: 22px;
  font-size: 14px;
  line-height: 22px;
  color: #bfbfbf;

  &.up { color: #059669; }
  &.down { color: #f43f5e; }
}
</style>
