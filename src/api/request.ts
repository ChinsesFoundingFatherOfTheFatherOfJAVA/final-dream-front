import axios from 'axios'

const request = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 0) return data
    alert(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    alert(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default request
