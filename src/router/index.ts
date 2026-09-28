import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/auth/Forbidden.vue'),
    meta: { title: '无权限', public: true }
  },
  // 管理端路由
  {
    path: '/',
    component: () => import('@/components/layout/AdminLayout.vue'),
    redirect: '/homepage',
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'homepage',
        name: 'AdminHome',
        component: () => import('@/views/admin/Home.vue'),
        meta: { title: '首页', activeMenu: 'homepage' }
      }
    ]
  },
  // 话术训练模块路由
  {
    path: '/sparring',
    component: () => import('@/components/layout/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'newmanage',
        name: 'SpeechTrainingCenter',
        component: () => import('@/views/admin/AICombat/SpeechTraining/index.vue'),
        meta: { title: '话术训练中心', activeMenu: 'speech-training' }
      },
      {
        path: 'newmanage/edit2',
        name: 'EditProject',
        component: () => import('@/views/admin/AICombat/SpeechTraining/EditProject.vue'),
        meta: { title: '创建项目', activeMenu: 'speech-training' }
      },
      {
        path: 'newmanage/console/:id',
        name: 'ProjectConsole',
        component: () => import('@/views/admin/AICombat/SpeechTraining/Console.vue'),
        redirect: (to) => ({ path: `${to.path}/flow`, query: to.query }),
        meta: { requiresAuth: true, requiresAdmin: true },
        children: [
          {
            path: 'overview',
            name: 'ProjectOverview',
            component: () => import('@/views/admin/AICombat/SpeechTraining/ProjectOverview.vue'),
            meta: { title: '整体概览' }
          },
          {
            path: 'flow',
            name: 'FlowDesign',
            component: () => import('@/views/admin/AICombat/SpeechTraining/FlowDesign.vue'),
            meta: { title: '流程设计' }
          },
          {
            path: 'basic',
            name: 'ProjectBasic',
            component: () => import('@/views/admin/AICombat/SpeechTraining/ProjectBasic.vue'),
            meta: { title: '基本信息' }
          },
          {
            path: 'student',
            name: 'ProjectStudents',
            component: () => import('@/views/admin/AICombat/SpeechTraining/ProjectStudents.vue'),
            meta: { title: '学员管理' }
          },
          {
            path: 'studentdetail',
            name: 'AdminStudentDetail',
            component: () => import('@/views/admin/AICombat/SpeechTraining/StudentReportPage.vue'),
            meta: { title: '学员详情' }
          }
        ]
      },
      {
        path: 'newtemplate',
        name: 'SpeechTemplate',
        component: () => import('@/views/admin/AICombat/SpeechTemplate/index.vue'),
        meta: { title: '话术模板', activeMenu: 'speech-template' }
      },
      {
        path: 'newtemplate/console/:id',
        name: 'TemplateConsole',
        component: () => import('@/views/admin/AICombat/SpeechTemplate/TemplateConsole.vue'),
        meta: { title: '模板控制台', activeMenu: 'speech-template' }
      },
      // AI实战训练场（铺满窗口：顶栏 + 左菜单 + 内容区内部滚动）
      {
        path: 'freesimulate',
        component: () => import('@/views/admin/AICombat/ActualTraining/index.vue'),
        redirect: '/sparring/freesimulate/topic',
        children: [
          {
            path: 'topic',
            name: 'ActualTopicList',
            component: () => import('@/views/admin/AICombat/ActualTraining/TopicList.vue'),
            meta: { title: '训练主题', activeMenu: 'actual-training', fullBleed: true }
          },
          {
            path: 'theme/:id',
            name: 'ActualThemeDetail',
            component: () => import('@/views/admin/AICombat/ActualTraining/ThemeDetail.vue'),
            meta: { title: '主题详情', activeMenu: 'actual-training', fullBleed: true }
          }
        ]
      },
      // AI 设计助手对话页（FP-30）：挂 AdminLayout，铺满窗口自带左右两栏，不经 ActualTraining 左菜单
      {
        path: 'freesimulate/assistant/:themeId?',
        name: 'ActualAssistant',
        component: () => import('@/views/admin/AICombat/ActualTraining/Assistant/index.vue'),
        meta: { title: 'AI 设计助手', activeMenu: 'actual-training', fullBleed: true }
      }
    ]
  },
  // 学员端路由
  {
    path: '/study',
    component: () => import('@/components/layout/StudentLayout.vue'),
    redirect: '/study/userhome',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'home',
        name: 'StudentHomePage',
        component: () => import('@/views/student/Home.vue'),
        meta: { title: '首页', activeMenu: 'student-home' }
      },
      {
        path: 'userhome',
        name: 'StudentHome',
        component: () => import('@/views/student/MyPractice.vue'),
        meta: { title: '我的陪练', activeMenu: 'userhome' }
      }
    ]
  },
  {
    // 学员端页面同样挂在 /sparring 前缀下，但父级路径不能再写一遍 '/sparring'：
    // 与管理端那条同名记录重复时，vue-router 按注册顺序取第一条匹配，
    // 只报错在运行期，导航到 /sparring 会命中管理端 AdminLayout 而白屏。这里改用 /sparring/web 作父级，
    // 子路由拼出来的完整路径与原来完全一致，跳转处不用改。
    path: '/sparring/web',
    component: () => import('@/components/layout/StudentLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'speech/list',
        name: 'SpeechList',
        component: () => import('@/views/student/AICombat/SpeechList.vue'),
        meta: { title: 'AI对练', activeMenu: 'speech' }
      },
      {
        path: 'script/detail/:projectId',
        name: 'ScriptDetail',
        component: () => import('@/views/student/AICombat/ScriptDetail.vue'),
        meta: { title: '话术训练详情', activeMenu: 'speech' }
      },
      {
        path: 'script/records/:projectId',
        name: 'PracticeRecords',
        component: () => import('@/views/student/AICombat/PracticeRecords.vue'),
        meta: { title: '练习记录', activeMenu: 'speech' }
      },
      {
        path: 'studentReport',
        name: 'StudentReport',
        component: () => import('@/views/admin/AICombat/SpeechTraining/StudentReportPage.vue'),
        meta: { title: '训练记录', activeMenu: 'speech' }
      }
    ]
  },
  // 训练对话页：全屏深色沉浸式（无顶部导航，按原平台截图 03/04）
  {
    path: '/sparring/web/script/training/:projectId',
    name: 'ScriptTraining',
    component: () => import('@/views/student/AICombat/ScriptTraining.vue'),
    meta: { title: '训练', requiresAuth: true }
  },
  // 训练报告页：全屏独立页（无顶部导航，按原平台截图 05）
  {
    path: '/sparring/standpracticereport',
    name: 'PracticeReport',
    component: () => import('@/views/student/AICombat/PracticeReport.vue'),
    meta: { title: '训练报告', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public === true) {
    return true
  }

  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  try {
    if (!auth.identityLoaded) {
      await auth.loadMe()
    }
  } catch {
    auth.logout()
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin === true && !auth.hasPermission('sparring:manage')) {
    return { path: '/403' }
  }

  return true
})

export default router
