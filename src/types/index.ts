export interface AppItem {
  id: string
  title: string
  description: string
  icon: string
  path: string
  color: string
}

export interface ProjectItem {
  id: string
  title: string
  tag: string
  status: string
  tags: string[]
  startTime: string
  endTime: string
}

export interface UserInfo {
  id: string
  name: string
  avatar: string
  level: number
  exp: number
  maxExp: number
  medals: number
  todayStudy: number
  certificates: number
  points: number
  credits: number
}

export interface TaskItem {
  id: string
  title: string
  tags: string[]
  startTime: string
  endTime: string
  category: string
  priority: 'high' | 'medium' | 'low'
}

export interface MenuItem {
  key: string
  label: string
  icon?: any
  children?: MenuItem[]
}
