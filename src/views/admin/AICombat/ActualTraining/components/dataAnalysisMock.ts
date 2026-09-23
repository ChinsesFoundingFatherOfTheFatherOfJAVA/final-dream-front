/**
 * FP-20 数据分析 Mock 数据（纯前端，不调后端）
 * 覆盖形态要求：有数据维度 / 无数据维度（该维度暂无练习数据）/ 未练第 2 次 / 三口径（首次、最近一次、全部记录）差异
 * 口径规则：首次 / 最近一次 → 单位为"人"；全部记录 → 单位为"百分比"
 */

export type AnalysisScope = 'first' | 'last' | 'all'

export interface DimDist { low: number; mid: number; high: number }
export interface DimMastery { avg: number | null; dist: DimDist | null }
export interface DimChange { firstScore: number; lastScore: number; delta: number; notSecondTime: boolean }

export interface ScopeDistribution {
  /** 均分 */
  avg: number
  /** 五段分布：<60 / 60-69 / 70-79 / 80-89 / 90-100（人 或 百分比） */
  segments: number[]
  /** 与首次相比的增减（null = 基准口径不显示） */
  deltas: number[] | null
}

export interface MockAnalysisData {
  overview: {
    practiced: number
    totalUser: number
    totalCount: number
    passRate: number
    passCount: number
    participantCount: number
  }
  distribution: Record<AnalysisScope, ScopeDistribution>
  /** 按维度名索引；null = 该维度暂无练习数据 */
  mastery: Record<AnalysisScope, Record<string, DimMastery | null>>
  /** 按维度名索引；null = 该维度暂无练习数据 */
  change: Record<string, DimChange | null>
}

// 各场景单元 mock（key = 单元序号）
const store: Record<number, MockAnalysisData> = {
  1: {
    overview: { practiced: 1, totalUser: 4, totalCount: 1, passRate: 0, passCount: 0, participantCount: 1 },
    distribution: {
      first: { avg: 10, segments: [1, 0, 0, 0, 0], deltas: null },
      last: { avg: 10, segments: [1, 0, 0, 0, 0], deltas: [0, 0, 0, 0, 0] },
      all: { avg: 10, segments: [100, 0, 0, 0, 0], deltas: [0, 0, 0, 0, 0] }
    },
    mastery: {
      first: {
        系统认知完整性: { avg: 0, dist: { low: 1, mid: 0, high: 0 } },
        量化指标准确运用: { avg: 0, dist: { low: 1, mid: 0, high: 0 } },
        场景差异辨析能力: null,
        标准话术规范使用: { avg: 40, dist: { low: 1, mid: 0, high: 0 } },
        价值整合与升华: null
      },
      last: {
        系统认知完整性: { avg: 0, dist: { low: 1, mid: 0, high: 0 } },
        量化指标准确运用: { avg: 0, dist: { low: 1, mid: 0, high: 0 } },
        场景差异辨析能力: null,
        标准话术规范使用: { avg: 40, dist: { low: 1, mid: 0, high: 0 } },
        价值整合与升华: null
      },
      all: {
        系统认知完整性: { avg: 0, dist: { low: 100, mid: 0, high: 0 } },
        量化指标准确运用: { avg: 0, dist: { low: 100, mid: 0, high: 0 } },
        场景差异辨析能力: null,
        标准话术规范使用: { avg: 40, dist: { low: 100, mid: 0, high: 0 } },
        价值整合与升华: null
      }
    },
    change: {
      系统认知完整性: { firstScore: 0, lastScore: 0, delta: 0, notSecondTime: true },
      量化指标准确运用: { firstScore: 0, lastScore: 0, delta: 0, notSecondTime: true },
      场景差异辨析能力: null,
      标准话术规范使用: { firstScore: 40, lastScore: 40, delta: 0, notSecondTime: true },
      价值整合与升华: null
    }
  },
  2: {
    overview: { practiced: 3, totalUser: 4, totalCount: 7, passRate: 33, passCount: 1, participantCount: 3 },
    distribution: {
      first: { avg: 58, segments: [1, 1, 1, 0, 0], deltas: null },
      last: { avg: 71, segments: [0, 1, 1, 1, 0], deltas: [-1, 0, 0, 1, 0] },
      all: { avg: 64, segments: [14, 29, 43, 14, 0], deltas: [-14, 0, 0, 14, 0] }
    },
    mastery: {
      first: {
        方案价值表达: { avg: 62, dist: { low: 0, mid: 2, high: 1 } },
        数据化论证: { avg: 55, dist: { low: 1, mid: 2, high: 0 } },
        需求挖掘: null,
        专业可信度: { avg: 70, dist: { low: 1, mid: 1, high: 1 } }
      },
      last: {
        方案价值表达: { avg: 74, dist: { low: 0, mid: 1, high: 2 } },
        数据化论证: { avg: 63, dist: { low: 1, mid: 1, high: 1 } },
        需求挖掘: null,
        专业可信度: { avg: 70, dist: { low: 1, mid: 1, high: 1 } }
      },
      all: {
        方案价值表达: { avg: 68, dist: { low: 17, mid: 50, high: 33 } },
        数据化论证: { avg: 59, dist: { low: 33, mid: 50, high: 17 } },
        需求挖掘: null,
        专业可信度: { avg: 70, dist: { low: 29, mid: 43, high: 28 } }
      }
    },
    change: {
      方案价值表达: { firstScore: 62, lastScore: 74, delta: 12, notSecondTime: false },
      数据化论证: { firstScore: 55, lastScore: 63, delta: 8, notSecondTime: false },
      需求挖掘: null,
      专业可信度: { firstScore: 70, lastScore: 70, delta: 0, notSecondTime: true }
    }
  },
  3: {
    overview: { practiced: 4, totalUser: 4, totalCount: 12, passRate: 50, passCount: 2, participantCount: 4 },
    distribution: {
      first: { avg: 66, segments: [1, 1, 1, 1, 0], deltas: null },
      last: { avg: 79, segments: [0, 0, 2, 1, 1], deltas: [-1, -1, 1, 0, 1] },
      all: { avg: 71, segments: [8, 25, 33, 25, 9], deltas: [-8, -25, 0, 0, 9] }
    },
    mastery: {
      first: {
        技术原理认知: { avg: 68, dist: { low: 0, mid: 3, high: 1 } },
        对比表达: { avg: 60, dist: { low: 1, mid: 2, high: 1 } },
        异议处理: { avg: 64, dist: { low: 1, mid: 3, high: 0 } },
        临场应变: { avg: 65, dist: { low: 1, mid: 2, high: 1 } }
      },
      last: {
        技术原理认知: { avg: 80, dist: { low: 0, mid: 1, high: 3 } },
        对比表达: { avg: 73, dist: { low: 0, mid: 3, high: 1 } },
        异议处理: { avg: 71, dist: { low: 0, mid: 3, high: 1 } },
        临场应变: { avg: 65, dist: { low: 1, mid: 2, high: 1 } }
      },
      all: {
        技术原理认知: { avg: 74, dist: { low: 8, mid: 42, high: 50 } },
        对比表达: { avg: 67, dist: { low: 17, mid: 58, high: 25 } },
        异议处理: { avg: 68, dist: { low: 17, mid: 75, high: 8 } },
        临场应变: { avg: 65, dist: { low: 25, mid: 50, high: 25 } }
      }
    },
    change: {
      技术原理认知: { firstScore: 68, lastScore: 80, delta: 12, notSecondTime: false },
      对比表达: { firstScore: 60, lastScore: 73, delta: 13, notSecondTime: false },
      异议处理: { firstScore: 64, lastScore: 71, delta: 7, notSecondTime: false },
      临场应变: { firstScore: 65, lastScore: 65, delta: 0, notSecondTime: true }
    }
  },
  4: {
    overview: { practiced: 2, totalUser: 4, totalCount: 5, passRate: 0, passCount: 0, participantCount: 2 },
    distribution: {
      first: { avg: 55, segments: [1, 1, 0, 0, 0], deltas: null },
      last: { avg: 63, segments: [0, 2, 0, 0, 0], deltas: [-1, 1, 0, 0, 0] },
      all: { avg: 60, segments: [20, 40, 20, 20, 0], deltas: [-20, 0, 20, 20, 0] }
    },
    mastery: {
      first: {
        证据呈现: { avg: 50, dist: { low: 1, mid: 1, high: 0 } },
        异议转化: null,
        情绪管理: { avg: 72, dist: { low: 0, mid: 2, high: 0 } },
        验证承诺: { avg: 48, dist: { low: 2, mid: 0, high: 0 } }
      },
      last: {
        证据呈现: { avg: 62, dist: { low: 0, mid: 2, high: 0 } },
        异议转化: null,
        情绪管理: { avg: 72, dist: { low: 0, mid: 2, high: 0 } },
        验证承诺: { avg: 55, dist: { low: 1, mid: 1, high: 0 } }
      },
      all: {
        证据呈现: { avg: 56, dist: { low: 33, mid: 67, high: 0 } },
        异议转化: null,
        情绪管理: { avg: 72, dist: { low: 0, mid: 100, high: 0 } },
        验证承诺: { avg: 52, dist: { low: 60, mid: 40, high: 0 } }
      }
    },
    change: {
      证据呈现: { firstScore: 50, lastScore: 62, delta: 12, notSecondTime: false },
      异议转化: null,
      情绪管理: { firstScore: 72, lastScore: 72, delta: 0, notSecondTime: true },
      验证承诺: { firstScore: 48, lastScore: 55, delta: 7, notSecondTime: false }
    }
  },
  5: {
    overview: { practiced: 4, totalUser: 4, totalCount: 20, passRate: 75, passCount: 3, participantCount: 4 },
    distribution: {
      first: { avg: 78, segments: [0, 1, 1, 1, 1], deltas: null },
      last: { avg: 86, segments: [0, 0, 0, 2, 2], deltas: [0, -1, -1, 1, 1] },
      all: { avg: 82, segments: [0, 10, 20, 40, 30], deltas: [0, -10, -20, 20, 30] }
    },
    mastery: {
      first: {
        价值整合: { avg: 75, dist: { low: 0, mid: 3, high: 1 } },
        结构化表达: { avg: 80, dist: { low: 0, mid: 1, high: 3 } },
        决策层视角: { avg: 78, dist: { low: 0, mid: 2, high: 2 } },
        收尾与推进: { avg: 70, dist: { low: 0, mid: 3, high: 1 } }
      },
      last: {
        价值整合: { avg: 88, dist: { low: 0, mid: 0, high: 4 } },
        结构化表达: { avg: 85, dist: { low: 0, mid: 1, high: 3 } },
        决策层视角: { avg: 82, dist: { low: 0, mid: 1, high: 3 } },
        收尾与推进: { avg: 70, dist: { low: 0, mid: 3, high: 1 } }
      },
      all: {
        价值整合: { avg: 82, dist: { low: 5, mid: 35, high: 60 } },
        结构化表达: { avg: 83, dist: { low: 0, mid: 30, high: 70 } },
        决策层视角: { avg: 80, dist: { low: 5, mid: 40, high: 55 } },
        收尾与推进: { avg: 70, dist: { low: 10, mid: 60, high: 30 } }
      }
    },
    change: {
      价值整合: { firstScore: 75, lastScore: 88, delta: 13, notSecondTime: false },
      结构化表达: { firstScore: 80, lastScore: 85, delta: 5, notSecondTime: false },
      决策层视角: { firstScore: 78, lastScore: 82, delta: 4, notSecondTime: false },
      收尾与推进: { firstScore: 70, lastScore: 70, delta: 0, notSecondTime: true }
    }
  }
}

/** 获取某场景单元的分析 mock 数据；无对应数据时返回通用空态 */
export function getMockAnalysis(unitSortOrder: number): MockAnalysisData {
  return (
    store[unitSortOrder] || {
      overview: { practiced: 0, totalUser: 0, totalCount: 0, passRate: 0, passCount: 0, participantCount: 0 },
      distribution: {
        first: { avg: 0, segments: [0, 0, 0, 0, 0], deltas: null },
        last: { avg: 0, segments: [0, 0, 0, 0, 0], deltas: [0, 0, 0, 0, 0] },
        all: { avg: 0, segments: [0, 0, 0, 0, 0], deltas: [0, 0, 0, 0, 0] }
      },
      mastery: { first: {}, last: {}, all: {} },
      change: {}
    }
  )
}
