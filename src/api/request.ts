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
    if (code === 401001) {
      clearStoredAuth()
      if (!response.config?.silent) toast.error(text)
      redirectToLogin()
      return Promise.reject(new Error(text))
    }
    if (code === 403001 || code === 403002) {
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

export default request
