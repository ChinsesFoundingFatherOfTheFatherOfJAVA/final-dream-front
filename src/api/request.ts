import axios from 'axios'
import { toast } from '@/utils/toast'
import {
  clearStoredAuth,
  getStoredToken,
  redirectToForbidden,
  redirectToLogin
} from '@/utils/auth'

/** 请求级配置扩展：silent=true 时拦截器不弹全局提示，由调用方自己处理失败 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean
  }
}

/**
 * 后端接口基地址（含 /api 前缀），封面等静态资源也通过该前缀经网关访问。
 *
 * 默认相对路径 '/api'（AI助手WS接入说明 §2.2）：绝对地址会让浏览器绕过前端开发服务器 /
 * Nginx 的代理直连网关，配了代理也不生效；且 WS 由本值推导，相对路径下自然同源
 * （开发 ws://localhost:3000/... → Vite 转发到后端 8082；生产 wss://同源 → Nginx 转发）。
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * 注意：**不要在此设置默认 Content-Type**。
 * axios 实例的默认头会被所有请求继承，包括 FormData 上传（材料上传 / 语音识别）——
 * 那会让 multipart 请求被标成 application/json，后端解析失败（实测报"缺少 boundary"）。
 * 普通 JSON 请求由 axios 根据 body 类型自动补 application/json，无需声明。
 */
const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

request.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 将后端返回的资源相对路径（如 /coverImage/xxx.png）补全为可直接访问的 URL。
 * 已是完整 URL（http/https/data/blob）时原样返回。
 */
export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 0) return data
    const text = message || '请求失败'
    if (code === 40101 || code === 401001) {
      clearStoredAuth()
      if (!response.config?.silent) toast.error(text)
      redirectToLogin()
      return Promise.reject(new Error(text))
    }
    if (code === 40301 || code === 403001 || code === 403002) {
      if (!response.config?.silent) toast.error(text)
      redirectToForbidden()
      return Promise.reject(new Error(text))
    }
    if (!response.config?.silent) toast.error(text)
    return Promise.reject(new Error(text))
  },
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth()
      redirectToLogin()
    } else if (error.response?.status === 403) {
      redirectToForbidden()
    }
    if (!error.config?.silent) toast.error(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export interface DownloadOptions {
  method?: 'GET' | 'POST'
  params?: Record<string, unknown>
  data?: unknown
  timeout?: number
}

/**
 * 文件下载统一入口（二进制流不能被共享拦截器按 JSON 解包）。
 *
 * <p>保留 401/403 处理：裸 axios/fetch 会绕过 request.ts 的登录失效与 403 跳转，
 * 所以下载也必须走这里，AGENTS 的"禁止裸 axios"规则对下载同样生效。
 */
export async function downloadBlob(url: string, options: DownloadOptions = {}): Promise<Blob> {
  const token = getStoredToken()
  const { method = 'GET', params, data, timeout = 120_000 } = options
  try {
    const res = await axios.request({
      url: `${API_BASE_URL}${url}`,
      method,
      params,
      data,
      responseType: 'blob',
      timeout,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    return res.data as Blob
  } catch (error: any) {
    if (error?.response?.status === 401) {
      clearStoredAuth()
      redirectToLogin()
    } else if (error?.response?.status === 403) {
      redirectToForbidden()
    }
    throw error
  }
}

/** 触发浏览器保存 Blob（下载链接只在这里创建，避免各 API 重复拼 DOM）。 */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default request
