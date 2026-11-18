import { computed, ref, shallowRef } from 'vue'
import { getActStat, getExamStat, getKngStat, getSpeechStat, getStaffStat } from '@/api/platformStat'
import type {
  ActStatCards,
  ExamStatCards,
  KngStatCards,
  PlatformStatBase,
  PlatformStatPoint,
  SpeechStatCards,
  StaffStat
} from '@/types/platformStat'

/**
 * 管理端首页「平台总览」的取数与降级。
 *
 * 契约：D:/JACK/plan/平台预览看板/01-需求文档.md 第 3、4 节。
 *
 * 为什么换算放在前端（该契约的 DER-01）：七个时间标签是「自然周期」语义，而四个后端服务只认
 * 绝对区间；把标签解释权留在前端，后端就不用各自猜「当月」是指月初到今天还是滚动 30 天，
 * 避免同一张看板出现两套时间口径。分桶粒度同理，由区间跨度决定后作为参数下传。
 */

/** 时间筛选标签，顺序与页面按钮一致 */
export const TIME_OPTIONS = ['上月', '当月', '上季度', '当季度', '上一年', '当年', '累计'] as const
export type TimeOption = (typeof TIME_OPTIONS)[number]

export type Granularity = 'day' | 'week' | 'month'

/** 换算后的绝对区间与粒度 */
export interface StatWindow {
  from: string
  to: string
  granularity: Granularity
}

/** 把 Date 格式化成后端约定的 yyyy-MM-dd HH:mm:ss */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 当天 00:00:00 */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

/** 当月 1 日 00:00:00；monthOffset 为负表示往前推几个月（自动跨年） */
function startOfMonth(base: Date, monthOffset = 0): Date {
  return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1, 0, 0, 0, 0)
}

/** 某个自然季度的首日 00:00:00；quarterOffset 为负表示往前推几个季度 */
function startOfQuarter(base: Date, quarterOffset = 0): Date {
  const q = Math.floor(base.getMonth() / 3) + quarterOffset
  return new Date(base.getFullYear(), q * 3, 1, 0, 0, 0, 0)
}

/** 区间跨度（天），用于选粒度 */
function spanDays(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000))
}

/**
 * 粒度选择口径（01-需求文档.md 第 3.2 节）：
 * ≤62 天按日、63~400 天按周、超过 400 天按月。上限 400 桶是为了让折线图点数可控，
 * 同时避免后端返回几千个点把首屏拖慢。
 */
export function pickGranularity(from: Date, to: Date): Granularity {
  const days = spanDays(from, to)
  if (days <= 62) return 'day'
  if (days <= 400) return 'week'
  return 'month'
}

/**
 * 标签 → 绝对区间（01-需求文档.md 第 3.1 节）。
 *
 * 注意「累计」用固定 2000-01-01 起点而不是纪元起点：本平台第一条业务数据不会早于此，
 * 且后端会用 stat.home.max-range-days 截断并回传 truncated，前端据此提示。
 */
export function resolveWindow(option: TimeOption, now: Date = new Date()): StatWindow {
  const todayEnd = now
  let from: Date
  let to: Date = todayEnd

  switch (option) {
    case '上月':
      from = startOfMonth(now, -1)
      to = new Date(startOfMonth(now, 0).getTime() - 1000)
      break
    case '当月':
      from = startOfMonth(now, 0)
      break
    case '上季度': {
      // 上一季度：先把基准点挪到本季度首日再往前一个季度，末日是本季度首日的前一秒
      const thisQuarterStart = startOfQuarter(now, 0)
      from = startOfQuarter(now, -1)
      to = new Date(thisQuarterStart.getTime() - 1000)
      break
    }
    case '当季度':
      from = startOfQuarter(now, 0)
      break
    case '上一年':
      from = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
      to = new Date(new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime() - 1000)
      break
    case '当年':
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      break
    case '累计':
    default:
      from = new Date(2000, 0, 1, 0, 0, 0, 0)
      break
  }

  return { from: fmt(from), to: fmt(to), granularity: pickGranularity(from, to) }
}

/** 单个业务域的加载状态：失败时保留 failed 标记，让页面只降级那一块 */
interface DomainState<T> {
  data: T | null
  failed: boolean
}

function emptyDomain<T>(): DomainState<T> {
  return { data: null, failed: false }
}

/**
 * 平台总览的取数状态。
 *
 * 并发与竞态：切标签时会产生多次请求，这里用自增的 requestSeq 只接受最后一次响应
 * （01-需求文档.md 第 4 节第 3 条），避免慢响应回来覆盖新结果。
 */
export function usePlatformOverview() {
  const selectedTime = ref<TimeOption>('当月')
  const loading = ref(false)

  const staff = shallowRef<DomainState<StaffStat>>(emptyDomain())
  const kng = shallowRef<DomainState<PlatformStatBase<KngStatCards>>>(emptyDomain())
  const speech = shallowRef<DomainState<PlatformStatBase<SpeechStatCards>>>(emptyDomain())
  const act = shallowRef<DomainState<PlatformStatBase<ActStatCards>>>(emptyDomain())
  const exam = shallowRef<DomainState<PlatformStatBase<ExamStatCards>>>(emptyDomain())

  let requestSeq = 0

  /**
   * 单域请求：失败只标记该域，不向上抛，保证其余卡片照常展示。
   *
   * 用「传 setter」而不是「传 ref」：四个域的类型各不相同（cards 结构不一样），
   * 传 ref 会退化成联合类型并被迫做类型断言，setter 让每个调用点自己的类型闭环。
   */
  async function loadDomain<T>(
    setter: (state: DomainState<T>) => void,
    fetcher: () => Promise<T>
  ): Promise<void> {
    try {
      setter({ data: await fetcher(), failed: false })
    } catch {
      setter({ data: null, failed: true })
    }
  }

  /** 账号计数不随时间变化，只在首次进入时取一次 */
  async function loadStaff(): Promise<void> {
    try {
      staff.value = { data: await getStaffStat(), failed: false }
    } catch {
      staff.value = { data: null, failed: true }
    }
  }

  /** 按当前标签并发取四域数据；过期响应按 requestSeq 丢弃 */
  async function reload(): Promise<void> {
    const seq = ++requestSeq
    const win = resolveWindow(selectedTime.value)
    loading.value = true
    const params = { from: win.from, to: win.to, granularity: win.granularity }
    try {
      await Promise.all([
        loadDomain<PlatformStatBase<KngStatCards>>((s) => (kng.value = s), () => getKngStat(params)),
        loadDomain<PlatformStatBase<SpeechStatCards>>((s) => (speech.value = s), () => getSpeechStat(params)),
        loadDomain<PlatformStatBase<ActStatCards>>((s) => (act.value = s), () => getActStat(params)),
        loadDomain<PlatformStatBase<ExamStatCards>>((s) => (exam.value = s), () => getExamStat(params))
      ])
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  /**
   * 是否至少有一个域（含账号域）失败。
   *
   * 为什么要把账号域算进来：启用人数卡片也走同一套降级逻辑，只统计业务域会让它失败时页面毫无提示。
   */
  const degraded = computed(
    () =>
      staff.value.failed ||
      kng.value.failed ||
      speech.value.failed ||
      act.value.failed ||
      exam.value.failed
  )

  /** 区间被后端截断时提示（四域共用同一上限，任一域置位即视为截断） */
  const truncated = computed(() =>
    [kng.value, speech.value, act.value, exam.value].some((d) => d.data?.range?.truncated === true)
  )

  /** 折线图桶标签：以任一有数据的域为准，四域桶序列长度与标签一致（接口约定按区间补齐） */
  const buckets = computed<string[]>(() => {
    const first =
      kng.value.data?.activity.series ??
      speech.value.data?.activity.series ??
      act.value.data?.activity.series ??
      exam.value.data?.activity.series ??
      []
    return first.map((p: PlatformStatPoint) => p.bucket)
  })

  /** 每个桶按域取活跃人数，缺域补 0，返回四域之和 */
  const activeUsersSeries = computed<number[]>(() => {
    const list = [kng.value, speech.value, act.value, exam.value]
    return buckets.value.map((_, i) => list.reduce((sum, d) => sum + (d.data?.activity.series[i]?.activeUsers ?? 0), 0))
  })

  /** 每个桶的活跃时长（小时）= 四域之和 */
  const activeHoursSeries = computed<number[]>(() => {
    const list = [kng.value, speech.value, act.value, exam.value]
    return buckets.value.map((_, i) =>
      Math.round(list.reduce((sum, d) => sum + (d.data?.activity.series[i]?.activeHours ?? 0), 0) * 100) / 100
    )
  })

  /** 每个桶的学习人数与学习时长：只有在线课堂域有「学习」这一概念 */
  const studiedUsersSeries = computed<number[]>(() =>
    buckets.value.map((_, i) => kng.value.data?.activity.series[i]?.activeUsers ?? 0)
  )
  const studyHoursSeries = computed<number[]>(() =>
    buckets.value.map((_, i) => kng.value.data?.activity.series[i]?.activeHours ?? 0)
  )

  /** 顶部卡片：四域活跃人数之和（各域内部已去重，跨域同一人可能重复计，见 01-需求文档.md 第 2.1 节） */
  const activeUsers = computed(() =>
    [kng.value, speech.value, act.value, exam.value].reduce((s, d) => s + (d.data?.activity.activeUsers ?? 0), 0)
  )

  /** 顶部卡片：四域活跃时长之和（小时） */
  const activeHours = computed(() => {
    const sum = [kng.value, speech.value, act.value, exam.value].reduce(
      (s, d) => s + (d.data?.activity.activeHours ?? 0),
      0
    )
    return Math.round(sum * 100) / 100
  })

  /**
   * 学习人数与学习时长只取在线课堂域。
   *
   * 该域失败时返回 null 而不是 0：「查不到」与「确实是 0」在页面上必须能区分（01-需求文档.md 第 4 节），
   * 否则后端一挂，看板会显示一片 0，看起来像「本月无人学习」这种业务事实。
   */
  const studiedUsers = computed<number | null>(() =>
    kng.value.failed ? null : (kng.value.data?.activity.activeUsers ?? 0)
  )
  const studyHours = computed<number | null>(() =>
    kng.value.failed ? null : (kng.value.data?.cards.studyHours ?? 0)
  )

  /** 首次进入按「当月」取数：账号计数只取一次，四域并发 */
  async function init(): Promise<void> {
    await Promise.all([loadStaff(), reload()])
  }

  /** 切换时间标签：写入后立即重取（页面按钮的 change 事件统一走这里） */
  async function selectTime(option: TimeOption): Promise<void> {
    if (selectedTime.value === option) return
    selectedTime.value = option
    await reload()
  }

  return {
    selectedTime,
    loading,
    degraded,
    truncated,
    buckets,
    staff: computed(() => staff.value),
    kng: computed(() => kng.value),
    speech: computed(() => speech.value),
    act: computed(() => act.value),
    exam: computed(() => exam.value),
    activeUsers,
    activeHours,
    studiedUsers,
    studyHours,
    activeUsersSeries,
    activeHoursSeries,
    studiedUsersSeries,
    studyHoursSeries,
    init,
    reload,
    selectTime
  }
}
