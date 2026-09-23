<template>
  <div class="student-panel">
    <!-- 工具栏（静态壳，均只提示） -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="comingSoon('学员功能建设中')">添加学员</button>
        <button class="btn btn-orange" @click="comingSoon('学员功能建设中')">一键催促（{{ participantCount }} 人）</button>
        <button class="btn btn-gray" disabled title="学员功能建设中">导出报告(PDF)</button>
      </div>
      <div class="toolbar-right">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="搜索学员姓名 / 账号 / 工号..." @focus="comingSoon('学员功能建设中')" />
        </div>
        <select class="toolbar-select" @change="comingSoon('学员功能建设中')">
          <option>部门</option>
        </select>
        <select class="toolbar-select" @change="comingSoon('学员功能建设中')">
          <option>全部状态</option>
        </select>
      </div>
    </div>

    <!-- 汇总块 -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-value">{{ participantCount }}</div>
        <div class="summary-label">管理员指派</div>
      </div>
      <div class="summary-card">
        <div class="summary-value green">0</div>
        <div class="summary-label">公开加入</div>
      </div>
    </div>

    <!-- 空数据表格（静态壳） -->
    <div class="table-wrap">
      <table class="student-table">
        <thead>
          <tr>
            <th>学员姓名</th>
            <th>部门</th>
            <th>来源</th>
            <th>状态</th>
            <th>场景通过</th>
            <th>练习次数</th>
            <th>平均得分</th>
            <th>训练均分</th>
            <th>最近活跃</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="10" class="empty-cell">
              <div class="empty-icon">👥</div>
              <p class="empty-text">学员功能建设中，敬请期待</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 表尾 -->
    <div class="table-footer">
      <span class="total">共 {{ participantCount }} 条</span>
      <div class="pager">
        <button class="page-btn" disabled>&lt;</button>
        <button class="page-btn active">1</button>
        <button class="page-btn" disabled>&gt;</button>
        <span class="page-size">10 条/页</span>
      </div>
      <span class="foot-note">场景完成率 100% 的学员无法被催促</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { comingSoon } from './ui'

defineProps<{ participantCount: number }>()
</script>

<style scoped lang="scss">
.student-panel {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .toolbar-left {
    display: flex;
    gap: 10px;
  }

  .btn {
    padding: 7px 14px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;

    &.btn-primary { background: #1890ff; color: #fff; &:hover { opacity: 0.85; } }
    &.btn-orange { background: #fff7e6; color: #fa8c16; border-color: #ffd591; &:hover { background: #fff1d6; } }
    &.btn-gray { background: #f5f5f5; color: #bbb; border-color: #ebeef5; cursor: not-allowed; }
  }

  .toolbar-right {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .search-box {
    position: relative;

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 13px;
    }

    .search-input {
      width: 220px;
      height: 32px;
      padding: 0 12px 0 28px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #333;
      outline: none;

      &::placeholder { color: #bbb; }
    }
  }

  .toolbar-select {
    height: 32px;
    padding: 0 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
    background: #fff;
    outline: none;
    cursor: pointer;
  }
}

.summary-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 18px;

  .summary-value {
    font-size: 24px;
    font-weight: 600;
    color: #1f2329;

    &.green { color: #52c41a; }
  }

  .summary-label {
    font-size: 13px;
    color: #8a8f98;
    margin-top: 2px;
  }
}

.table-wrap {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.student-table {
  width: 100%;
  border-collapse: collapse;

  th {
    padding: 11px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #646a73;
    text-align: left;
    background: #f7f8fa;
    border-bottom: 1px solid #ebeef2;
    white-space: nowrap;
  }

  td {
    padding: 12px 14px;
    font-size: 14px;
    color: #4e5969;
    border-bottom: 1px solid #f2f3f5;
  }

  .empty-cell {
    text-align: center;
    padding: 48px 0;

    .empty-icon { font-size: 36px; margin-bottom: 10px; }
    .empty-text { font-size: 14px; color: #999; margin: 0; }
  }
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;

  .total { font-size: 14px; color: #8a8f98; }

  .pager {
    display: flex;
    align-items: center;
    gap: 6px;

    .page-btn {
      min-width: 28px;
      height: 28px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background: #fff;
      font-size: 14px;
      color: #4e5969;
      cursor: pointer;

      &.active { background: #1890ff; color: #fff; border-color: #1890ff; }
      &:disabled { color: #c0c4cc; cursor: not-allowed; }
    }

    .page-size { font-size: 13px; color: #8a8f98; margin-left: 6px; }
  }

  .foot-note { font-size: 13px; color: #bbb; }
}
</style>
