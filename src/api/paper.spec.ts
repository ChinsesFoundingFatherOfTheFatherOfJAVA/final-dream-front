import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 回归护栏：试卷模块的所有接口都必须带 /exam 前缀。
 *
 * <p>网关用声明顺序匹配路由，`/api/exam/**` 只排在 `/api/**` 通配路由之前一点点；
 * 一旦前端路径漏了 /exam，请求会被通配路由转给 SpeechTraining，
 * 表现为每个操作都弹「接口不存在」——这是实际踩过的线上问题，所以用测试钉死。
 */

const { calls, requestMock, downloadBlobMock } = vi.hoisted(() => {
  const calls: string[] = []
  const record = (url: string) => {
    calls.push(url)
    return Promise.resolve({})
  }
  const downloadBlobMock = vi.fn((url: string) => {
    calls.push(url)
    return Promise.resolve(new Blob())
  })
  return {
    calls,
    requestMock: {
      get: vi.fn(record),
      post: vi.fn(record),
      put: vi.fn(record),
      delete: vi.fn(record)
    },
    downloadBlobMock
  }
})

vi.mock('./request', () => ({
  default: requestMock,
  API_BASE_URL: '/api',
  downloadBlob: downloadBlobMock,
  saveBlob: vi.fn()
}))

import * as paper from './paper'

/** 调用所有会发请求的导出函数，收集它们实际发出的 URL。 */
const exerciseAllApis = async () => {
  const id = 'p1'
  const qid = 'q1'
  const query = {
    queryType: 0, keyword: '', catalogId: '', routingPath: '',
    creatorUserId: '', buildType: -1, disabled: -1, status: -1
  }

  await paper.getPaperCatalogTree()
  await paper.getPaperCatalogDetail('c1')
  await paper.createPaperCatalogBatch({
    parentId: 'root', catalogText: 'a', adminUserIds: [],
    inheritParentAuth: 0, childInheritCurrentAuth: 0
  })
  await paper.updatePaperCatalog('c1', {
    name: 'a', adminUserIds: [], inheritParentAuth: 0, childInheritCurrentAuth: 0
  })
  await paper.movePaperCatalog('c1', 'root')
  await paper.disablePaperCatalog('c1', 1)
  await paper.deletePaperCatalog('c1')
  await paper.getPaperList(1, 10, 'updateTime', 'desc', query)
  await paper.getPaperDetail(id)
  await paper.createPaper({ name: 'a', catalogId: 'root', buildType: 0, secrecy: 0 })
  await paper.updatePaper(id, { name: 'a', catalogId: 'root', buildType: 0, secrecy: 0 })
  await paper.disablePaper(id, 1)
  await paper.deletePaper(id)
  await paper.transferPaper(id, 'u1')
  await paper.changePaperCatalog(id, 'root')
  await paper.batchPaper('delete', [id])
  await paper.getPaperEditCanvas(id)
  await paper.getPaperQuesList(id, 1, 10, -1, -1, '')
  await paper.addPaperQuestion(id, { sectionIndex: 0, score: 1, libId: 'l1', question: {} })
  await paper.pickPaperQuestions(id, [{ quesId: qid, score: 1, sectionIndex: 0 }])
  await paper.updatePaperQuestion(id, qid, { score: 2 })
  await paper.removePaperQuestion(id, qid)
  await paper.sortPaperQuestions(id, [{ quesId: qid, sectionIndex: 0, orderIndex: 1 }])
  await paper.batchPaperScore(id, [{ sectionIndex: 0, score: 2 }])
  await paper.getPaperOverview(id)
  await paper.releasePaper(id)
  await paper.getPaperShare(id)
  await paper.savePaperShare(id, [])
  await paper.getPaperUseList(id)
  await paper.getScoreConfig()
  await paper.saveScoreConfig([{ type: 0, levelType: 0, score: 1, missScore: 0, missScoreType: 0 }])
  await paper.getPaperStrategy(id)
  await paper.setPaperStrategySource(id, { sourceType: 0, libs: [] })
  await paper.updateStrategyCell(id, { libId: 'l1', levelType: 0, field: 'singleQty', value: 1 })
  await paper.getStrategySummary(id)
  await paper.updatePaperQuesMode(id, 0)
  await paper.exportPaperList(query)
  await paper.downloadPaperTemplate()
  await paper.importPaperFile(new File(['x'], 'a.xlsx'), 'l1', 'root', 0)
}

describe('api/paper 路径前缀', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('所有接口都走 /exam 前缀（否则会被网关通配路由转走，报“接口不存在”）', async () => {
    await exerciseAllApis()

    expect(calls.length).toBeGreaterThan(35)
    const bad = calls.filter(url => !url.startsWith('/exam/') && !url.startsWith('/api/exam/'))
    expect(bad).toEqual([])
  })
})
