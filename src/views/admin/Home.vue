<template>
  <div class="admin-home">
    <!-- 常用应用区域 -->
    <section class="section common-apps">
      <div class="section-header">
        <h2 class="section-title">常用应用</h2>
        <span class="edit-icon" aria-hidden="true" title="敬请期待">✏️</span>
      </div>
      <div class="apps-content">
        <div
          class="app-card"
          role="button"
          tabindex="0"
          @click="goToAIPractice"
          @keydown.enter.prevent="goToAIPractice"
        >
          <div class="app-icon">
            <span class="icon-text" aria-hidden="true">🤖</span>
          </div>
          <div class="app-info">
            <h3 class="app-title">AI对练</h3>
            <p class="app-desc">轻松提升沟通技巧</p>
          </div>
        </div>
        <div
          class="app-card"
          role="button"
          tabindex="0"
          @click="goToActualTraining"
          @keydown.enter.prevent="goToActualTraining"
        >
          <div class="app-icon actual-icon">
            <span class="icon-text" aria-hidden="true">🎯</span>
            <span class="ai-badge">AI</span>
          </div>
          <div class="app-info">
            <h3 class="app-title">AI实战训练场</h3>
            <p class="app-desc">围绕真实业务场景展开动态实战训练</p>
          </div>
        </div>
        <div
          class="app-card"
          role="button"
          tabindex="0"
          @click="router.push('/exam/queslib')"
          @keydown.enter.prevent="router.push('/exam/queslib')"
        >
          <div class="app-icon exam-icon">
            <span class="icon-text" aria-hidden="true">📝</span>
          </div>
          <div class="app-info">
            <h3 class="app-title">测练中心</h3>
            <p class="app-desc">题库与考试管理</p>
          </div>
        </div>
        <div
          v-if="hasKngAccess"
          class="app-card"
          role="button"
          tabindex="0"
          @click="goToOnlineClassroom"
          @keydown.enter.prevent="goToOnlineClassroom"
        >
          <div class="app-icon kng-icon">
            <span class="icon-text" aria-hidden="true">K</span>
          </div>
          <div class="app-info">
            <h3 class="app-title">在线课堂</h3>
            <p class="app-desc">专业的企业学习资源运营</p>
          </div>
        </div>
        <div class="app-guide">
          <div class="guide-illustration">
            <div class="guide-text">
              <span class="guide-title">我需要</span>
              <span class="guide-content">课程内容 ></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 常用功能区域 -->
    <section class="section common-functions">
      <div class="section-header">
        <h2 class="section-title">常用功能</h2>
        <span class="edit-icon" aria-hidden="true" title="敬请期待">✏️</span>
      </div>
      <div class="functions-grid">
        <div class="function-card" title="敬请期待">
          <span class="function-icon" aria-hidden="true">👤</span>
          <span class="function-name">员工名册</span>
        </div>
        <div class="function-card" title="敬请期待">
          <span class="function-icon" aria-hidden="true">📋</span>
          <span class="function-name">标签列表</span>
        </div>
        <div class="function-card" title="敬请期待">
          <span class="function-icon" aria-hidden="true">📢</span>
          <span class="function-name">公告消息</span>
        </div>
        <div class="function-card" title="敬请期待">
          <span class="function-icon" aria-hidden="true">⚙️</span>
          <span class="function-name">个性化装修</span>
        </div>
      </div>
    </section>

    <!-- 平台总览区域 -->
    <section class="section platform-overview">
      <div class="section-header">
        <h2 class="section-title">平台总览</h2>
        <span class="info-icon" aria-hidden="true" title="敬请期待">ℹ️</span>
      </div>

      <!-- 时间筛选标签 -->
      <el-radio-group v-model="selectedTime" size="small" class="time-filter">
        <el-radio-button
          v-for="item in timeOptions"
          :key="item"
          :value="item"
        >
          {{ item }}
        </el-radio-button>
      </el-radio-group>

      <!-- 数据统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-label">活跃人数 <span class="tip" aria-hidden="true">ℹ</span></div>
          <div class="stat-value">94</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path d="M0,30 Q25,10 50,25 T100,20" fill="none" stroke="#1890ff" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">学习人数 <span class="tip" aria-hidden="true">ℹ</span></div>
          <div class="stat-value">37</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path d="M0,35 Q25,15 50,30 T100,25" fill="none" stroke="#52c41a" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">启用人数 <span class="tip" aria-hidden="true">ℹ</span></div>
          <div class="stat-value">974</div>
          <div class="stat-bar">
            <div class="bar-fill" style="width: 70%"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">活跃时长 (h) <span class="tip" aria-hidden="true">ℹ</span></div>
          <div class="stat-value">157.31</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path d="M0,20 Q25,35 50,15 T100,25" fill="none" stroke="#1890ff" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">学习时长 (h) <span class="tip" aria-hidden="true">ℹ</span></div>
          <div class="stat-value">55.54</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path d="M0,25 Q25,10 50,30 T100,20" fill="none" stroke="#52c41a" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总学分 <span class="tip" aria-hidden="true">ℹ</span></div>
          <div class="stat-value">198.3</div>
          <div class="stat-trend">
            <svg aria-hidden="true" width="100" height="40" viewBox="0 0 100 40">
              <path d="M0,30 Q25,20 50,35 T100,15" fill="none" stroke="#1890ff" stroke-width="2"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 数据图表 -->
      <div class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">活跃人数/学习人数</h3>
          <div class="chart-placeholder">
            <svg aria-hidden="true" width="100%" height="200" viewBox="0 0 400 200">
              <path d="M50,150 Q100,50 150,120 T250,80 T350,100" fill="none" stroke="#1890ff" stroke-width="2"/>
              <path d="M50,180 Q100,100 150,150 T250,120 T350,140" fill="none" stroke="#52c41a" stroke-width="2"/>
              <text x="50" y="195" font-size="12" fill="#999">08.26</text>
              <text x="150" y="195" font-size="12" fill="#999">08.30</text>
              <text x="250" y="195" font-size="12" fill="#999">09.03</text>
              <text x="350" y="195" font-size="12" fill="#999">09.09</text>
            </svg>
          </div>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color" style="background: #1890ff"></span>
              活跃人数
            </span>
            <span class="legend-item">
              <span class="legend-color" style="background: #52c41a"></span>
              学习人数
            </span>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">活跃时长/学习时长 (h)</h3>
          <div class="chart-placeholder">
            <svg aria-hidden="true" width="100%" height="200" viewBox="0 0 400 200">
              <path d="M50,100 Q100,180 150,80 T250,120 T350,60" fill="none" stroke="#1890ff" stroke-width="2"/>
              <path d="M50,150 Q100,120 150,160 T250,100 T350,130" fill="none" stroke="#52c41a" stroke-width="2"/>
              <text x="50" y="195" font-size="12" fill="#999">08.26</text>
              <text x="150" y="195" font-size="12" fill="#999">08.30</text>
              <text x="250" y="195" font-size="12" fill="#999">09.03</text>
              <text x="350" y="195" font-size="12" fill="#999">09.09</text>
            </svg>
          </div>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color" style="background: #1890ff"></span>
              活跃时长
            </span>
            <span class="legend-item">
              <span class="legend-color" style="background: #52c41a"></span>
              学习时长
            </span>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="detail-cards">
        <div class="detail-card">
          <div class="card-header">
            <h3 class="card-title">课程情况 <span class="tip" aria-hidden="true">ℹ</span></h3>
            <el-radio-group v-model="courseScope" size="small" class="card-tabs">
              <el-radio-button value="全部">全部</el-radio-button>
              <el-radio-button value="内部">内部</el-radio-button>
              <el-radio-button value="外部">外部</el-radio-button>
            </el-radio-group>
          </div>
          <div class="card-content">
            <div class="stat-row"><span class="stat-label">课程总量</span><span class="stat-value">1,358</span></div>
            <div class="stat-row"><span class="stat-label">本期新增</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">学习人次</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">学习时长 (h)</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">完成人次</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">评论数</span><span class="stat-value">0</span></div>
          </div>
          <div class="card-chart">
            <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e8e8e8" stroke-width="20"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1890ff" stroke-width="20" stroke-dasharray="314" stroke-dashoffset="78.5" transform="rotate(-90 60 60)"/>
            </svg>
            <div class="chart-legend-vertical">
              <span class="legend-item"><span class="legend-color" style="background: #1890ff"></span>指派学习时长</span>
              <span class="legend-item"><span class="legend-color" style="background: #52c41a"></span>自主学习时长</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <div class="card-header">
            <h3 class="card-title">项目情况 <span class="tip" aria-hidden="true">ℹ</span></h3>
          </div>
          <div class="card-content">
            <div class="stat-row"><span class="stat-label">项目总量</span><span class="stat-value">38</span></div>
            <div class="stat-row"><span class="stat-label">本期新增</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">覆盖人次</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">学习人次</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">完成人次</span><span class="stat-value">0</span></div>
          </div>
          <div class="card-chart">
            <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
              <polygon points="20,20 100,20 80,60 40,60" fill="#1890ff" opacity="0.8"/>
              <polygon points="40,60 80,60 70,100 50,100" fill="#52c41a" opacity="0.8"/>
              <text x="60" y="45" text-anchor="middle" fill="#fff" font-size="12">0%</text>
              <text x="60" y="85" text-anchor="middle" fill="#fff" font-size="12">0%</text>
            </svg>
            <div class="chart-legend-vertical">
              <span class="legend-item"><span class="legend-color" style="background: #1890ff"></span>学习率</span>
              <span class="legend-item"><span class="legend-color" style="background: #52c41a"></span>完成率</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <div class="card-header">
            <h3 class="card-title">考试情况 <span class="tip" aria-hidden="true">ℹ</span></h3>
          </div>
          <div class="card-content">
            <div class="stat-row"><span class="stat-label">考试总量</span><span class="stat-value">1,981</span></div>
            <div class="stat-row"><span class="stat-label">本期新增</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">覆盖人次</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">参考人次</span><span class="stat-value">0</span></div>
            <div class="stat-row"><span class="stat-label">通过人次</span><span class="stat-value">0</span></div>
          </div>
          <div class="card-chart">
            <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e8e8e8" stroke-width="15"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1890ff" stroke-width="15" stroke-dasharray="314" stroke-dashoffset="314" transform="rotate(-90 60 60)"/>
              <text x="60" y="65" text-anchor="middle" fill="#333" font-size="14">0%</text>
            </svg>
            <div class="chart-legend-vertical">
              <span class="legend-item"><span class="legend-color" style="background: #1890ff"></span>考试通过率 0%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const selectedTime = ref('当月')
const courseScope = ref('全部')
const timeOptions = ['上月', '当月', '上季度', '当季度', '上一年', '当年', '累计']
const hasKngAccess = computed(() =>
  auth.hasPermission('kng:catalog') ||
  auth.hasPermission('kng:courseware') ||
  auth.hasPermission('kng:course') ||
  auth.hasPermission('kng:setting')
)

const goToAIPractice = () => {
  router.push('/sparring/newmanage')
}

const goToActualTraining = () => {
  router.push('/sparring/freesimulate/topic')
}

const goToOnlineClassroom = () => {
  router.push('/kng/catalog')
}
</script>

<style scoped lang="scss">
.admin-home {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.edit-icon, .info-icon {
  color: #999;
  font-size: 14px;
}

.tip {
  font-size: 12px;
  color: #ccc;
  cursor: help;
}

// 常用应用
.apps-content {
  display: flex;
  align-items: flex-start;
  gap: 32px;
}

.app-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  // 悬停只变化背景与阴影，过渡按实际属性收敛
  transition: background-color 0.3s, box-shadow 0.3s;

  &:hover {
    background: #f5f5f5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* role="button" 的 div 拿不到全局 a/button 焦点环，
     键盘可达性需自行补 outline 焦点环（outline 不占布局） */
  &:focus-visible {
    outline: 2px solid var(--color-primary, #1890ff);
    outline-offset: 2px;
  }

  .app-icon {
    position: relative;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;

    &.actual-icon {
      background: linear-gradient(135deg, #6b5ce7 0%, #8b7cf7 100%);

      .ai-badge {
        position: absolute;
        top: -4px;
        right: -6px;
        padding: 1px 5px;
        font-size: 10px;
        font-weight: 600;
        color: #fff;
        background: #ff7d45;
        border-radius: 6px;
        line-height: 1.4;
      }
    }

    &.kng-icon {
      background: #e75487;
    }
  }

  .app-info {
    .app-title { font-size: 14px; font-weight: 500; color: #333; margin: 0 0 4px 0; }
    .app-desc { font-size: 12px; color: #999; margin: 0; }
  }
}

.app-guide {
  margin-left: auto;
  width: 200px;
  height: 120px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  .guide-text {
    text-align: center;
    .guide-title { font-size: 14px; color: #333; display: block; }
    .guide-content { font-size: 16px; font-weight: 500; color: #1890ff; display: block; }
  }
}

// 常用功能
.functions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.function-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  /* 占位卡片暂无点击功能：去掉 pointer/hover 伪交互，避免误导为可点击；
     随之也没有任何过渡属性，transition 一并移除 */

  .function-icon { font-size: 24px; }
  .function-name { font-size: 14px; color: #333; }
}

// 平台总览
.time-filter {
  margin-bottom: 20px;

  :deep(.el-radio-button__inner) {
    height: 30px;
    padding: 0 12px;
    font-size: 12px;
    line-height: 28px;
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;

  .stat-label { font-size: 12px; color: #999; margin-bottom: 8px; }
  .stat-value { font-size: 24px; font-weight: 600; color: #333; margin-bottom: 8px; }
  .stat-trend { height: 40px; }
  .stat-bar { height: 8px; background: #e8e8e8; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: #1890ff; border-radius: 4px; }
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;

  .chart-title { font-size: 14px; font-weight: 500; color: #333; margin: 0 0 16px 0; }
  .chart-placeholder { background: #fafafa; border-radius: 4px; margin-bottom: 12px; }
}

.chart-legend {
  display: flex;
  gap: 16px;
  justify-content: center;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #666;

    .legend-color { width: 12px; height: 12px; border-radius: 2px; }
  }
}

.detail-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.detail-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .card-title { font-size: 14px; font-weight: 500; color: #333; margin: 0; }
  }

  .card-tabs {
    :deep(.el-radio-button__inner) {
      height: 26px;
      padding: 0 8px;
      font-size: 12px;
      line-height: 24px;
    }
  }

  .card-content { margin-bottom: 16px; }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f5f5f5;

    &:last-child { border-bottom: none; }
    .stat-label { font-size: 12px; color: #999; }
    .stat-value { font-size: 14px; font-weight: 500; color: #333; }
  }

  .card-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .chart-legend-vertical {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #666;

      .legend-color { width: 12px; height: 12px; border-radius: 2px; }
    }
  }
}
</style>
