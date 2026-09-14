import type { AppItem, ProjectItem, UserInfo, TaskItem } from '@/types'

export const mockApps: AppItem[] = [
  { id: '1', title: '培训中心', description: '高效组织企业培训', icon: '/icons/training.png', path: '/training', color: '#ff7d00' },
  { id: '2', title: '培训规划', description: '培训规划', icon: '/icons/plan.png', path: '/plan', color: '#ff7d00' },
  { id: '3', title: '在线课堂', description: '专业的企业学习资源运营', icon: '/icons/classroom.png', path: '/classroom', color: '#52c41a' },
  { id: '4', title: '测练中心', description: '系统的考核管理工具', icon: '/icons/test.png', path: '/test', color: '#13c2c2' },
  { id: '5', title: '调查中心', description: '调查场景丰富多样', icon: '/icons/survey.png', path: '/survey', color: '#1890ff' },
  { id: '6', title: '师资管理', description: '管理提升企业师资力量', icon: '/icons/teacher.png', path: '/teacher', color: '#eb2f96' },
  { id: '7', title: '社区管理', description: '全场景的社交化学习', icon: '/icons/community.png', path: '/community', color: '#1890ff' },
  { id: '8', title: 'AI实战训练场', description: '围绕真实业务场景展开动态实战训练', icon: '/icons/ai-combat.png', path: '/ai-combat', color: '#722ed1' },
  { id: '9', title: '直播中心', description: '培训专属的直播平台', icon: '/icons/live.png', path: '/live', color: '#f5222d' },
  { id: '10', title: '面授中心', description: '高效组织现场教学', icon: '/icons/offline.png', path: '/offline', color: '#ff7d00' },
  { id: '11', title: '微课中心', description: '高效制作互动微课', icon: '/icons/micro.png', path: '/micro', color: '#52c41a' },
  { id: '12', title: '游戏中心', description: '让学习更有趣', icon: '/icons/game.png', path: '/game', color: '#faad14' },
  { id: '13', title: 'AI对练', description: '轻松提升沟通技巧', icon: '/icons/ai-practice.png', path: '/sparring/newmanage', color: '#1890ff' },
  { id: '14', title: 'AI知识助手', description: '让学习更便捷', icon: '/icons/ai-assistant.png', path: '/ai-assistant', color: '#1890ff' },
  { id: '15', title: '知识中心', description: '沉淀并激活企业知识', icon: '/icons/knowledge.png', path: '/knowledge', color: '#13c2c2' }
]

export const mockProjects: ProjectItem[] = [
  {
    id: '1',
    title: 'AI-10话术考试',
    tag: '项目安排',
    status: '已发布',
    tags: ['培训', '重要'],
    startTime: '2026-04-21 00:00',
    endTime: '2026-05-31 00:00'
  },
  {
    id: '2',
    title: 'AI-10话术练习',
    tag: '项目安排',
    status: '已发布',
    tags: ['培训'],
    startTime: '2026-04-21 00:00',
    endTime: '2026-05-31 00:00'
  },
  {
    id: '3',
    title: 'AI-10模拟考试',
    tag: '项目安排',
    status: '已发布',
    tags: ['培训'],
    startTime: '2026-04-21 00:00',
    endTime: '2026-05-31 00:00'
  },
  {
    id: '4',
    title: 'AI-10实战演练',
    tag: '项目安排',
    status: '已发布',
    tags: ['培训', '重要'],
    startTime: '2026-04-21 00:00',
    endTime: '2026-05-31 00:00'
  }
]

export const mockUser: UserInfo = {
  id: '1',
  name: '管理员',
  avatar: '',
  level: 2,
  exp: 280,
  maxExp: 24000,
  medals: 0,
  todayStudy: 0,
  certificates: 0,
  points: 0,
  credits: 0
}

export const mockTasks: TaskItem[] = [
  {
    id: '1',
    title: '艾图AI-10销售话术学习与陪练',
    tags: ['培训', '重要'],
    startTime: '2026-04-09 00:00',
    endTime: '2026-09-30 23:59',
    category: '培训',
    priority: 'high'
  }
]
