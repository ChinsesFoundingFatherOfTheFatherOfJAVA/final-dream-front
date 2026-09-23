import type { LastDimension, ReportDimension } from '@/types/student'

/** 参与雷达图的维度：score 为 null 表示本次未参与评分，画出来会被当成 0 分 */
export const scoredDimensions = (dimensions: ReportDimension[] | null | undefined): ReportDimension[] =>
  (dimensions ?? []).filter((d) => d.score != null)

/**
 * 按本次维度顺序取上次报告的得分。
 *
 * 维度是按名称配置的，本次新增或改名的维度在上次报告里不存在。缺失的维度**不能补 0**：
 * 补 0 会让"上次"虚线在那个顶点砸到圆心，看上去像那次考了 0 分。因此只要有一个维度对不上，
 * 整条对比线就不画（values 为 null），由页面说明原因。
 */
export const lastScoresFor = (
  scored: ReportDimension[],
  lastDimensions: LastDimension[] | null | undefined
): { values: number[] | null; incomplete: boolean } => {
  if (!lastDimensions?.length) return { values: null, incomplete: false }
  const lastMap = new Map(lastDimensions.map((d) => [d.dimensionName, d.score]))
  const values = scored.map((d) => lastMap.get(d.dimensionName))
  if (values.every((v): v is number => v != null)) return { values, incomplete: false }
  return { values: null, incomplete: true }
}
