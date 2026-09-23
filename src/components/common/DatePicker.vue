<template>
  <div class="date-picker" ref="rootRef">
    <input
      type="text"
      class="date-input"
      :value="displayValue"
      :placeholder="placeholder"
      readonly
      @click="togglePanel"
    />
    <span class="calendar-icon" @click="togglePanel">📅</span>

    <div v-if="visible" class="picker-panel">
      <div class="panel-header">
        <button class="nav-btn" @click="changeMonth(-1)">‹</button>
        <div class="header-center">
          <select class="year-select" :value="viewYear" @change="onYearChange">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
          <select class="month-select" :value="viewMonth" @change="onMonthChange">
            <option v-for="(m, i) in months" :key="i" :value="i">{{ m }}月</option>
          </select>
        </div>
        <button class="nav-btn" @click="changeMonth(1)">›</button>
      </div>

      <div class="week-header">
        <span v-for="w in weekDays" :key="w" class="week-cell">{{ w }}</span>
      </div>

      <div class="days-grid">
        <span
          v-for="(day, index) in calendarDays"
          :key="index"
          class="day-cell"
          :class="{
            'other-month': !day.current,
            today: day.isToday,
            selected: day.dateStr === modelValue
          }"
          @click="selectDay(day)"
        >
          {{ day.day }}
        </span>
      </div>

      <div class="panel-footer">
        <button class="btn-text" @click="clearValue">清空</button>
        <div class="footer-right">
          <button class="btn-text" @click="selectToday">今天</button>
          <button class="btn-text primary" @click="visible = false">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  showTime?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择日期',
  showTime: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement>()
const visible = ref(false)
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth())

const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const yearOptions = computed(() => {
  const list = []
  for (let y = now.getFullYear() - 10; y <= now.getFullYear() + 10; y++) list.push(y)
  return list
})

const displayValue = computed(() => props.modelValue || '')

const pad = (n: number) => (n < 10 ? '0' + n : '' + n)

const calendarDays = computed(() => {
  const days: any[] = []
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth.value === 0 ? 11 : viewMonth.value - 1
    const y = viewMonth.value === 0 ? viewYear.value - 1 : viewYear.value
    days.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}`, isToday: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear.value}-${pad(viewMonth.value + 1)}-${pad(d)}`
    days.push({ day: d, current: true, dateStr, isToday: dateStr === todayStr })
  }

  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth.value === 11 ? 0 : viewMonth.value + 1
    const y = viewMonth.value === 11 ? viewYear.value + 1 : viewYear.value
    days.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}`, isToday: false })
  }

  return days
})

const togglePanel = () => {
  visible.value = !visible.value
  if (visible.value && props.modelValue) {
    const [datePart = ''] = props.modelValue.split(' ')
    const [year, month] = datePart.split('-')
    if (year && month) {
      viewYear.value = parseInt(year, 10)
      viewMonth.value = parseInt(month, 10) - 1
    }
  }
}

const changeMonth = (delta: number) => {
  let m = viewMonth.value + delta
  let y = viewYear.value
  if (m < 0) { m = 11; y-- }
  if (m > 11) { m = 0; y++ }
  viewMonth.value = m
  viewYear.value = y
}

const onYearChange = (e: Event) => {
  viewYear.value = parseInt((e.target as HTMLSelectElement).value)
}

const onMonthChange = (e: Event) => {
  viewMonth.value = parseInt((e.target as HTMLSelectElement).value)
}

const selectDay = (day: any) => {
  const time = props.showTime ? ' 00:00' : ' 00:00'
  emit('update:modelValue', day.dateStr + time)
  viewYear.value = parseInt(day.dateStr.split('-')[0])
  viewMonth.value = parseInt(day.dateStr.split('-')[1]) - 1
}

const selectToday = () => {
  const d = new Date()
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  emit('update:modelValue', dateStr + ' 00:00')
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

const clearValue = () => {
  emit('update:modelValue', '')
  visible.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    visible.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped lang="scss">
.date-picker {
  position: relative;
  display: inline-block;
  width: 100%;
}

.date-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  background: #fff;

  &:hover { border-color: #40a9ff; }
  &:focus { border-color: #1890ff; }
}

.calendar-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  cursor: pointer;
  pointer-events: none;
}

.picker-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 2000;
  width: 280px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  padding: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .nav-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    font-size: 18px;
    color: #666;
    cursor: pointer;
    border-radius: 4px;

    &:hover { background: #f5f5f5; color: #1890ff; }
  }

  .header-center {
    display: flex;
    gap: 8px;

    select {
      border: none;
      background: none;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      cursor: pointer;
      outline: none;
    }
  }
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;

  .week-cell {
    text-align: center;
    font-size: 12px;
    color: #999;
    padding: 4px 0;
  }
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;

  .day-cell {
    text-align: center;
    font-size: 13px;
    color: #333;
    padding: 6px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: #e6f7ff; color: #1890ff; }
    &.other-month { color: #ccc; }
    &.today { color: #1890ff; font-weight: 600; border: 1px solid #91d5ff; }
    &.selected { background: #1890ff; color: #fff; }
  }
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;

  .footer-right { display: flex; gap: 8px; }

  .btn-text {
    border: none;
    background: none;
    font-size: 13px;
    color: #666;
    cursor: pointer;

    &:hover { color: #1890ff; }
    &.primary { color: #1890ff; }
  }
}
</style>
