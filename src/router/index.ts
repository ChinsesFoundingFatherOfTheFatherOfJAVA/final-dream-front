import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { resolveRouteAccess } from './routeAccess'

const routes: RouteRecordRaw[] = [
  {
    // F21 答卷详情（原平台同样是从考试详情跳出去的独立页面）
    path: '/exam/result',
    name: 'ExamResult',
    component: () => import('@/views/exam/arrange/ResultPage.vue'),
    meta: { title: '答卷详情', requiresAuth: true, requiresAdmin: true, permission: 'exam:manage' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/auth/Forbidden.vue'),
    meta: { title: '无权限', public: true },
  },
  {
    // FP-10 固定出卷编辑页：**独立全屏页**（原平台同样是跳转出去的独立页面，
    // 不复用测练中心的头部与左侧菜单），故放在 /exam 布局路由之外。
    path: '/exam/paper/quick',
    name: 'ExamPaperQuick',
    component: () => import('@/views/exam/paper/PaperQuickEditPage.vue'),
    meta: { title: '固定出卷', requiresAuth: true, requiresAdmin: true, permission: 'exam:paper' },
  },
  {
    // FP-08/09 随机出卷编辑页：同上，独立全屏页
    path: '/exam/paper/auto',
    name: 'ExamPaperAuto',
    component: () => import('@/views/exam/paper/PaperAutoEditPage.vue'),
    meta: { title: '随机出卷', requiresAuth: true, requiresAdmin: true, permission: 'exam:paper' },
  },
  {
    path: '/exam',
    component: () => import('@/views/exam/ExamLayout.vue'),
    redirect: '/exam/queslib',
    meta: {
      title: '测练中心',
      requiresAuth: true,
      requiresAdmin: true,
      permissionAny: ['exam:queslib', 'exam:paper', 'exam:manage'],
    },
    children: [
      {
        path: 'queslib',
        name: 'ExamQuesLib',
        component: () => import('@/views/exam/queslib/QuesLibPage.vue'),
        meta: { title: '题库管理', permission: 'exam:queslib' },
      },
      {
        // FP-06 题库详情页（题库列表「管理」列跳这里，带 ?libId=）
        path: 'queslib/detail',
        name: 'ExamQuesLibDetail',
        component: () => import('@/views/exam/queslib/QuesLibDetailPage.vue'),
        meta: { title: '题库详情', permission: 'exam:queslib' },
      },
      {
        // FP-08 试题编辑/新建页：?id= 编辑，?libId= 新建（03 §3.2 上方路由表）
        path: 'quesdetail',
        name: 'ExamQuesDetail',
        component: () => import('@/views/exam/queslib/QuesFormPage.vue'),
        meta: { title: '试题编辑', permission: 'exam:queslib' },
      },
      {
        // FP-04/05 试卷管理主页（分类树 + 试卷列表，截图01）
        path: 'paper',
        name: 'ExamPaper',
        component: () => import('@/views/exam/paper/PaperPage.vue'),
        meta: { title: '组卷', permission: 'exam:paper' },
      },
      {
        // FP-07 试卷管理页（试题列表，截图02）
        path: 'paper/detail',
        name: 'ExamPaperDetail',
        component: () => import('@/views/exam/paper/PaperDetailPage.vue'),
        meta: { title: '试卷管理', permission: 'exam:paper' },
      },
      {
        // F15/F16/F17/F18 创建考试向导（三步：创建试卷 → 编辑试题 → 发布考试）
        path: 'exam-mgmt/create',
        name: 'ExamMgmtCreate',
        component: () => import('@/views/exam/arrange/ExamCreateWizardPage.vue'),
        meta: { title: '创建考试', permission: 'exam:manage' },
      },
      {
        // F18 发布配置页（新考试向导第三步 / 已发布考试编辑共用）
        path: 'exam-mgmt/publish',
        name: 'ExamMgmtPublish',
        component: () => import('@/views/exam/arrange/ExamPublishPage.vue'),
        meta: { title: '发布考试', permission: 'exam:manage' },
      },
      {
        // F1/F2/F3/F4 考试管理主页（分类树 + 考试列表）
        path: 'exam-mgmt',
        name: 'ExamMgmt',
        component: () => import('@/views/exam/arrange/ExamMgmtPage.vue'),
        meta: { title: '考试管理', permission: 'exam:manage' },
      },
      {
        // F6~F12 考试详情（三 tab：考生情况 / 试题分析 / 统计分析）
        path: 'exam-mgmt/detail',
        name: 'ExamMgmtDetail',
        component: () => import('@/views/exam/arrange/ExamDetailPage.vue'),
        meta: { title: '考试详情', permission: 'exam:manage' },
      },
      {
        // 考试批阅：原平台「考试管理 > 考试批阅」的并列项，本轮未建设
        path: 'exam-review',
        name: 'ExamReview',
        component: () => import('@/views/exam/PlaceholderPage.vue'),
        meta: { title: '考试批阅', permission: 'exam:manage' },
      },
      {
        path: 'practice',
        name: 'ExamPractice',
        component: () => import('@/views/exam/PlaceholderPage.vue'),
        meta: { title: '练习管理', permission: 'exam:manage' },
      },
      {
        path: 'feedback',
        name: 'ExamFeedback',
        component: () => import('@/views/exam/PlaceholderPage.vue'),
        meta: { title: '题目反馈', permission: 'exam:manage' },
      },
      {
        path: 'field',
        name: 'ExamField',
        component: () => import('@/views/exam/PlaceholderPage.vue'),
        meta: { title: '字段设置', permission: 'exam:manage' },
      },
    ],
  },
  {
    // 课程设计器是独立全屏工作区，不套在线课堂侧栏，避免编辑器被主布局压缩
    path: '/kng/course/edit/:id/designer',
    name: 'KngCourseDesigner',
    component: () => import('@/views/onlineclassroom/course/designer/CourseDesigner.vue'),
    meta: {
      title: '编辑课程-章节任务',
      requiresAuth: true,
      requiresAdmin: true,
      permission: 'kng:course',
    },
  },
  {
    path: '/kng',
    component: () => import('@/views/onlineclassroom/OnlineClassroomLayout.vue'),
    redirect: () => {
      const auth = useAuthStore()
      if (auth.hasPermission('kng:catalog')) return '/kng/catalog'
      if (auth.hasPermission('kng:courseware')) return '/kng/courseware'
      if (auth.hasPermission('kng:course')) return '/kng/course'
      if (auth.hasPermission('kng:setting')) return '/kng/setting'
      return '/403'
    },
    meta: {
      title: '在线课堂',
      requiresAuth: true,
      requiresAdmin: true,
      permissionAny: ['kng:courseware', 'kng:course', 'kng:catalog', 'kng:setting'],
    },
    children: [
      {
        path: 'courseware',
        name: 'KngCourseware',
        component: () => import('@/views/onlineclassroom/courseware/CoursewareMgmt.vue'),
        meta: { title: '课件管理', permission: 'kng:courseware' },
      },
      {
        path: 'courseware/info/:id',
        name: 'KngCoursewareInfo',
        component: () => import('@/views/onlineclassroom/courseware/CoursewareInfo.vue'),
        meta: { title: '课件详情', permission: 'kng:courseware' },
      },
      {
        path: 'courseware/edit/:id',
        name: 'KngCoursewareEdit',
        component: () => import('@/views/onlineclassroom/courseware/CoursewareForm.vue'),
        props: { mode: 'edit', variant: 'file' },
        meta: { title: '编辑课件', permission: 'kng:courseware' },
      },
      {
        path: 'courseware/publish/:variant',
        name: 'KngCoursewarePublish',
        component: () => import('@/views/onlineclassroom/courseware/CoursewareForm.vue'),
        props: (route) => ({
          mode: 'create',
          variant: ['file', 'scorm', 'html', 'link'].includes(String(route.params.variant))
            ? String(route.params.variant)
            : 'file',
        }),
        meta: { title: '发布课件', permission: 'kng:courseware' },
      },
      {
        path: 'courseware/transcode',
        name: 'KngCoursewareTranscode',
        component: () => import('@/views/onlineclassroom/courseware/TranscodeMgmt.vue'),
        meta: { title: '转码管理', permission: 'kng:courseware' },
      },
      {
        path: 'courseware/subtitles',
        name: 'KngCoursewareSubtitles',
        component: () => import('@/views/onlineclassroom/courseware/SubtitleMgmt.vue'),
        meta: { title: '字幕管理', permission: 'kng:courseware' },
      },
      {
        path: 'course',
        name: 'KngCourse',
        component: () => import('@/views/onlineclassroom/course/CourseMgmt.vue'),
        meta: { title: '课程管理', permission: 'kng:course' },
      },
      {
        path: 'course/info/:id',
        name: 'KngCourseInfo',
        component: () => import('@/views/onlineclassroom/course/CourseInfo.vue'),
        meta: { title: '课程详情', permission: 'kng:course' },
      },
      {
        // CS-05 课程内课件学习详情（列=课件学习详情+学习进度%）
        path: 'course/courseware-study/:courseId/:coursewareId',
        name: 'KngCourseCoursewareStudy',
        component: () => import('@/views/onlineclassroom/course/CoursewareStudyInCourse.vue'),
        meta: { title: '课件学习详情', permission: 'kng:course' },
      },
      {
        // CS-08 创建课程第一步（预填"未命名课程"+继承左树选中分类）
        path: 'course/create/step1',
        name: 'KngCourseCreate',
        component: () => import('@/views/onlineclassroom/course/CourseForm.vue'),
        props: { mode: 'create' },
        meta: { title: '创建课程', permission: 'kng:course' },
      },
      {
        // CS-07 编辑课程第一步（基本信息）
        path: 'course/edit/:id/step1',
        name: 'KngCourseEditStep1',
        component: () => import('@/views/onlineclassroom/course/CourseForm.vue'),
        props: { mode: 'edit' },
        meta: { title: '编辑课程', permission: 'kng:course' },
      },
      {
        path: 'catalog',
        name: 'KngCatalog',
        component: () => import('@/views/onlineclassroom/catalog/CatalogManage.vue'),
        meta: { title: '分类管理', permission: 'kng:catalog' },
      },
      {
        path: 'setting',
        name: 'KngSetting',
        component: () => import('@/views/onlineclassroom/CourseSetting.vue'),
        meta: { title: '课程设置', permission: 'kng:setting' },
      },
    ],
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
        meta: { title: '首页', activeMenu: 'homepage' },
      },
      {
        path: 'enterprise',
        component: () => import('@/components/layout/EnterpriseLayout.vue'),
        redirect: () => {
          const auth = useAuthStore()
          if (auth.hasPermission('org:employee')) return '/enterprise/staff'
          if (auth.hasPermission('org:department')) return '/enterprise/departments'
          if (auth.hasPermission('role:mgmt')) return '/enterprise/roles'
          return '/403'
        },
        meta: {
          title: '我的企业',
          activeMenu: 'enterprise',
          fullBleed: true,
          permissionAny: ['org:employee', 'org:department', 'role:mgmt'],
        },
        children: [
          {
            path: 'staff',
            name: 'EnterpriseStaff',
            component: () => import('@/views/admin/Enterprise/index.vue'),
            meta: { title: '员工名册', permission: 'org:employee' },
          },
          {
            path: 'departments',
            name: 'EnterpriseDepartments',
            component: () => import('@/views/admin/EnterpriseDepartments/index.vue'),
            meta: { title: '部门管理', permission: 'org:department' },
          },
          {
            path: 'roles',
            name: 'RoleManagement',
            component: () => import('@/views/admin/RoleMgmt/index.vue'),
            meta: { title: '角色权限', permission: 'role:mgmt' },
          },
          {
            path: 'roles/users/:id',
            name: 'RoleUsers',
            component: () => import('@/views/admin/RoleUsers/index.vue'),
            meta: { title: '角色人员管理', permission: 'role:mgmt' },
          },
        ],
      },
    ],
  },
  // 话术训练模块路由
  {
    path: '/sparring',
    component: () => import('@/components/layout/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      permissionAny: ['act:speech', 'act:template', 'act:training'],
    },
    children: [
      {
        path: 'newmanage',
        name: 'SpeechTrainingCenter',
        component: () => import('@/views/admin/AICombat/SpeechTraining/index.vue'),
        meta: { title: '话术训练中心', activeMenu: 'speech-training', permission: 'act:speech' },
      },
      {
        path: 'newmanage/edit2',
        name: 'EditProject',
        component: () => import('@/views/admin/AICombat/SpeechTraining/EditProject.vue'),
        meta: { title: '创建项目', activeMenu: 'speech-training', permission: 'act:speech' },
      },
      {
        path: 'newmanage/console/:id',
        name: 'ProjectConsole',
        component: () => import('@/views/admin/AICombat/SpeechTraining/Console.vue'),
        redirect: (to) => ({ path: `${to.path}/flow`, query: to.query }),
        meta: { requiresAuth: true, requiresAdmin: true, permission: 'act:speech' },
        children: [
          {
            path: 'overview',
            name: 'ProjectOverview',
            component: () => import('@/views/admin/AICombat/SpeechTraining/ProjectOverview.vue'),
            meta: { title: '整体概览' },
          },
          {
            path: 'flow',
            name: 'FlowDesign',
            component: () => import('@/views/admin/AICombat/SpeechTraining/FlowDesign.vue'),
            meta: { title: '流程设计' },
          },
          {
            path: 'basic',
            name: 'ProjectBasic',
            component: () => import('@/views/admin/AICombat/SpeechTraining/ProjectBasic.vue'),
            meta: { title: '基本信息' },
          },
          {
            path: 'student',
            name: 'ProjectStudents',
            component: () => import('@/views/admin/AICombat/SpeechTraining/ProjectStudents.vue'),
            meta: { title: '学员管理' },
          },
          {
            path: 'studentdetail',
            name: 'AdminStudentDetail',
            component: () => import('@/views/admin/AICombat/SpeechTraining/StudentReportPage.vue'),
            meta: { title: '学员详情' },
          },
        ],
      },
      {
        path: 'newtemplate',
        name: 'SpeechTemplate',
        component: () => import('@/views/admin/AICombat/SpeechTemplate/index.vue'),
        meta: { title: '话术模板', activeMenu: 'speech-template', permission: 'act:template' },
      },
      {
        path: 'newtemplate/console/:id',
        name: 'TemplateConsole',
        component: () => import('@/views/admin/AICombat/SpeechTemplate/TemplateConsole.vue'),
        meta: { title: '模板控制台', activeMenu: 'speech-template', permission: 'act:template' },
      },
      // AI实战训练场（铺满窗口：顶栏 + 左菜单 + 内容区内部滚动）
      {
        path: 'freesimulate',
        component: () => import('@/views/admin/AICombat/ActualTraining/index.vue'),
        redirect: '/sparring/freesimulate/topic',
        meta: { permission: 'act:training' },
        children: [
          {
            path: 'topic',
            name: 'ActualTopicList',
            component: () => import('@/views/admin/AICombat/ActualTraining/TopicList.vue'),
            meta: { title: '训练主题', activeMenu: 'actual-training', fullBleed: true },
          },
          {
            path: 'theme/:id',
            name: 'ActualThemeDetail',
            component: () => import('@/views/admin/AICombat/ActualTraining/ThemeDetail.vue'),
            meta: { title: '主题详情', activeMenu: 'actual-training', fullBleed: true },
          },
        ],
      },
      // AI 设计助手对话页（FP-30）：挂 AdminLayout，铺满窗口自带左右两栏，不经 ActualTraining 左菜单
      {
        path: 'freesimulate/assistant/:themeId?',
        name: 'ActualAssistant',
        component: () => import('@/views/admin/AICombat/ActualTraining/Assistant/index.vue'),
        meta: {
          title: 'AI 设计助手',
          activeMenu: 'actual-training',
          fullBleed: true,
          permission: 'act:training',
        },
      },
    ],
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
        meta: { title: '首页', activeMenu: 'student-home' },
      },
      {
        path: 'userhome',
        name: 'StudentHome',
        component: () => import('@/views/student/MyPractice.vue'),
        meta: { title: '我的陪练', activeMenu: 'userhome' },
      },
    ],
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
        meta: { title: 'AI对练', activeMenu: 'speech' },
      },
      {
        path: 'script/detail/:projectId',
        name: 'ScriptDetail',
        component: () => import('@/views/student/AICombat/ScriptDetail.vue'),
        meta: { title: '话术训练详情', activeMenu: 'speech' },
      },
      {
        path: 'script/records/:projectId',
        name: 'PracticeRecords',
        component: () => import('@/views/student/AICombat/PracticeRecords.vue'),
        meta: { title: '练习记录', activeMenu: 'speech' },
      },
      {
        path: 'studentReport',
        name: 'StudentReport',
        component: () => import('@/views/admin/AICombat/SpeechTraining/StudentReportPage.vue'),
        meta: { title: '训练记录', activeMenu: 'speech' },
      },
      // ===== AI实战训练场学员端（契约 02 §3.1）=====
      {
        path: 'drillmate',
        name: 'DrillmateHome',
        component: () => import('@/views/student/AICombat/Drillmate/Home.vue'),
        meta: { title: 'AI实战训练场', requiresAuth: true },
      },
      {
        path: 'drillmate/detail/:themeId',
        name: 'DrillmateThemeDetail',
        component: () => import('@/views/student/AICombat/Drillmate/ThemeDetail.vue'),
        meta: { title: '主题详情', requiresAuth: true },
      },
      {
        path: 'drillmate/history',
        name: 'DrillmateHistory',
        component: () => import('@/views/student/AICombat/Drillmate/History.vue'),
        meta: { title: '练习历程', requiresAuth: true },
      },
      {
        path: 'drillmate/files/:materialId',
        name: 'DrillmateFileViewer',
        component: () => import('@/views/student/AICombat/Drillmate/FileViewer.vue'),
        meta: { title: '资料查看', requiresAuth: true },
      },
    ],
  },
  // ===== 对练运行时与报告：独立全屏页，不挂 StudentLayout（契约 02 §3.1）=====
  {
    path: '/sparring/web/drillmate/attempt/:attemptId',
    name: 'DrillmateAttempt',
    component: () => import('@/views/student/AICombat/Drillmate/AttemptPage.vue'),
    meta: { title: '实战训练', requiresAuth: true },
  },
  {
    path: '/sparring/web/drillmate/report/:attemptId',
    name: 'DrillmateReport',
    component: () => import('@/views/student/AICombat/Drillmate/ReportPage.vue'),
    meta: { title: '训练报告', requiresAuth: true },
  },
  // 训练对话页：全屏深色沉浸式（无顶部导航，按原平台截图 03/04）
  {
    path: '/sparring/web/script/training/:projectId',
    name: 'ScriptTraining',
    component: () => import('@/views/student/AICombat/ScriptTraining.vue'),
    meta: { title: '训练', requiresAuth: true },
  },
  // 训练报告页：全屏独立页（无顶部导航，按原平台截图 05）
  {
    path: '/sparring/standpracticereport',
    name: 'PracticeReport',
    component: () => import('@/views/student/AICombat/PracticeReport.vue'),
    meta: { title: '训练报告', requiresAuth: true },
  },
  // 404 兜底：必须放在路由表最后，否则会吞掉后面的具体路由
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/auth/NotFound.vue'),
    meta: { title: '页面不存在', public: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => resolveRouteAccess(to, useAuthStore()))

export default router
