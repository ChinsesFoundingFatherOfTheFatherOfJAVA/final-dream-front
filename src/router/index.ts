import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  // 管理端路由
  {
    path: '/',
    component: () => import('@/components/layout/AdminLayout.vue'),
    redirect: '/homepage',
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
      }
    ]
  },
  // 学员端路由
  {
    path: '/study',
    component: () => import('@/components/layout/StudentLayout.vue'),
    redirect: '/study/userhome',
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
    path: '/sparring',
    component: () => import('@/components/layout/StudentLayout.vue'),
    children: [
      {
        path: 'web/speech/list',
        name: 'SpeechList',
        component: () => import('@/views/student/AICombat/SpeechList.vue'),
        meta: { title: 'AI对练', activeMenu: 'speech' }
      },
      {
        path: 'web/script/detail/:projectId',
        name: 'ScriptDetail',
        component: () => import('@/views/student/AICombat/ScriptDetail.vue'),
        meta: { title: '话术训练详情', activeMenu: 'speech' }
      },
      {
        path: 'web/script/records/:projectId',
        name: 'PracticeRecords',
        component: () => import('@/views/student/AICombat/PracticeRecords.vue'),
        meta: { title: '练习记录', activeMenu: 'speech' }
      }
    ]
  },
  // 训练对话页：全屏深色沉浸式（无顶部导航，按原平台截图 03/04）
  {
    path: '/sparring/web/script/training/:projectId',
    name: 'ScriptTraining',
    component: () => import('@/views/student/AICombat/ScriptTraining.vue'),
    meta: { title: '训练' }
  },
  // 训练报告页：全屏独立页（无顶部导航，按原平台截图 05）
  {
    path: '/sparring/standpracticereport',
    name: 'PracticeReport',
    component: () => import('@/views/student/AICombat/PracticeReport.vue'),
    meta: { title: '训练报告' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
