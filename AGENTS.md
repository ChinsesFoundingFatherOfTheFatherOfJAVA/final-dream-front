# AGENTS.md · front-end（杰克数字人陪练平台 · 复刻平台前端）

## 1. 应用定位

全站唯一前端工程（Vue 3 SPA，hash 路由），覆盖管理端与学员端：
组织架构/员工名册/角色权限（/enterprise）、在线课堂（/kng/**）、AI实战训练场与话术训练管理端（/sparring/**）、
学员端训练与报告（`/sparring/web/**`）。所有 HTTP 经统一 `/api` 前缀走网关（8080）。

## 2. 技术栈与结构

- Vue 3.5（`<script setup>` + TS）· Vite 8 · Element Plus（`main.ts` 全量注册，主题由 `src/assets/styles/element-theme.scss` 统一覆盖；主色 `#1890ff`）· Pinia · vue-router（hash 模式）· vue-flow（流程设计器）· echarts · axios。
- 目录：`src/api`（按后端模块拆分的请求封装）、`src/views`（admin / student / onlineclassroom / auth / exam）、
  `src/components/layout`（AdminLayout/EnterpriseLayout/AdminTopNav/StudentTopNav）、`src/stores`（auth/training）、`src/utils`、`src/mock`、`src/types`。
- 测试：Vitest + @vue/test-utils（`npm run test`）；类型检查 `vue-tsc`（`npm run build` 自带 type-check）。

## 3. 铁律（违反即返工）

1. **请求一律走 `src/api/request.ts`**（axios 实例，baseURL `/api`）：
   - 请求拦截器统一附 `Authorization: Bearer <token>`（网关边缘鉴权依赖它，缺头会被 401 拦截）；
   - 响应拦截器统一解 `{code,message,data}`：code=0 返回 data；40101/401001 与 HTTP 401 必须 `logout()` 清 Pinia，不能只清 localStorage，否则登录页会跳回原页面并持续弹出 401；401 不弹 axios 原文；403xx 跳无权限页；
   - `silent: true` 供"失败不打扰用户"的调用（如详情页说明性请求）；
   - **禁止**在组件里直接 new axios/fetch 调后端，禁止绕过拦截器吞掉 code≠0。
2. **静态资源 URL 用 `resolveAssetUrl()`** 补全（`/coverImage/**`、`/audio/**`、`/avatar/**` 经网关前缀访问）；
   不要手拼后端地址。
3. **类型契约**：新增接口先在 `src/types/*.ts` 补类型，`src/api/*.ts` 按后端模块一一对应
   （sm→StaffManagement、act→AtualCombatTraining、kng→OnlineClassroom、student/speechAdmin→SpeechTraining）。
   后端 id 类型按各接口实际契约：SM/Exam 使用 string，ST/ACT 旧接口（project/template/flow）使用 number；
   不要跨模块强行统一，新增类型以实际 DTO 为准。
4. **WebSocket**：AI 助手 WS 直连 8082（网关 WebMVC 版不支持 WS upgrade，见 vite.config.ts 代理注释与
   `复刻平台前端/AI助手WS接入说明.md`）；不要试图把 WS 收进网关路由。
5. **路由权限**：`meta.requiresAuth / requiresAdmin / permission / permissionAny`（如 `kng:courseware`、
   `act:speech`、`exam:manage`）；守卫在 `src/router/routeAccess.ts`，`src/router/index.ts` 只做接线。
   新增页面必须声明 meta；`permissionAny` 用于横跨多个子模块的布局路由；超管豁免在 auth store 的 `hasPermission`。
6. **后端契约口径**：统一 `ApiResponse{code,message,data}`、code=0 成功、业务失败 HTTP 200 + 非零 code；
   分页有两种历史形状——ST/ACT 的 `PageResult{records,total}` 与 SM 的 `PageVo{list,total,page,size}`，
   封装 API 时按后端实际返回建类型，不要想当然。

## 4. 已知事项与约定

- **样式规范基线（2026-10-24）**：全局层已提供 a/button 的 `:focus-visible` 焦点环、`touch-action: manipulation`、
  `prefers-reduced-motion` 降级、表格/分页等宽数字（`src/assets/styles/reset.scss`、`element-theme.scss`），
  组件层不要重复实现。自定义可点元素（div/span 带 @click）统一口径：
  `role="button" + tabindex="0" + @keydown.enter.prevent` + `:focus-visible` 焦点环；
  过渡只列具体属性、禁 `transition: all`；纯图标按钮补 `aria-label`、装饰图标补 `aria-hidden`。
  依据《Web Interface Guidelines》（Vercel）全量规则走查，全站约 130 个文件已按此基线修复。
- **mock 数据边界**：`src/mock/data.ts` 仅剩静态导航注册表用途（TopNav/AdminTopNav 的 `mockApps`）；
  学员端"我的练习"页（MyPractice.vue）已于 2026-10-02 接入 `getStudentProjects` 真实接口，
  侧边栏勋章/经验值/积分仍是静态展示，待产品确认口径。
- **ACT_USE_MOCK**（`src/api/actTheme.ts`）已固定 false；mock 函数保留用于离线开发，禁止把开关改回 true 提交。
- dev 代理在 `vite.config.ts`：`/api/act/ws` → ws://localhost:8082（WS 直连）、其余 `/api` → 网关 8080，
  可用 `VITE_PROXY_TARGET` / `VITE_SM_PROXY_TARGET` 环境变量覆盖。
- token 存 localStorage（`final_dream.auth`）；JWT 12h 过期，过期统一走 401 分支跳登录。
- **报告雷达图（2026-10-26）**：`score=null` 不进坐标轴；`score=0` 必须画。语速指标无语音轮是 0 分，不是未参与。
- 仓库卫生（2026-10-02）：`.mimosa/`、`test-results/` 已加入 `.gitignore` 并移出索引；
  源码树内的《复刻平台前端》《复刻话术训练模块》文档目录已迁至 `D:\JACK\plan` 仓库。
- **UI 控件口径（2026-10-22）**：普通表单、列表、分页、弹窗、抽屉、树控件统一使用 Element Plus；文件上传原生 `input`、聊天输入区、FlowDesign/NodeConfigPanel/EdgeWeightDialog、玩家/字幕专用交互和全屏 AI 生成向导属于已登记例外。新增页面不得恢复手写通用控件。
- **抽屉约定**：考试域等自定义业务抽屉使用 `class="exam-drawer"` 的 `el-drawer`，`with-header=false` 时在内部保留业务头部；抽屉内容自行管理滚动，点击遮罩由 Element Plus 负责关闭。

## 5. 构建与验证

- `npm run test`（vitest，当前 **8 个 spec / 35 个用例**必须全绿）；`npm run type-check`、`npm run build-only`（Vite 打包）通过后再提交。
- 本地联调：后端网关 8080 + ACT 8082（WS）在跑即可 `npm run dev`（端口 3000）。
- 提交前跑 `npm run format`（prettier），不要提交与本次改动无关的大面积格式化。

## 6. 工作方式

1. 代码实施过程中出现技术或逻辑修改，要及时将技术方案文档同步修改。
2. 关键类、方法、代码行要加上标准的描述功能或步骤的注释（中文，说明"为什么"，不是复述代码）。
3. 出现信息缺失或认为实现方案不合理的情况一定要和用户沟通确认！！！

## 7. 改 .vue 必须跑 SFC 检查（2026-11-13 血泪）

`vue-tsc` **不编译模板**，`vitest` 也只测逻辑。两者全绿而页面白屏的事在这个项目里发生了 **4 次**：

| 事故 | 破坏点 | 表现 |
|---|---|---|
| 1 | 模板多一个 `</template>` | Vite 500「Element is missing end tag」 |
| 2 | 模板缺闭合标签 | 同上 |
| 3 | `<style lang="scss">` 多一个 `}` | Vite 500「unmatched "}"」 |
| 4 | 删代码时把文件末尾的 `</style>` 一起删了 | 整页白屏 |

**改完任何 `.vue` 都要跑**：

```bash
node scripts/check-sfc.mjs src/views/<改的文件>.vue
# 或全量
find src -name "*.vue" | xargs node scripts/check-sfc.mjs
```

该脚本用 Vue 官方编译器同时校验**模板 + SCSS**，与 Vite 同一编译路径。
第 4 次事故后补上了 SCSS 校验——只查模板是不够的。

## 8. el-table 三个高频坑（2026-11-13 实测）

### 8.1 高度：用 `max-height`，不要自己算

错误做法（我试过三种，全错）：`min-height: 0`（被挤成一条缝）、写死 `380px`（行数一变就不对）、
`min-height: calc(表头 + 行高 × 每页条数)`（**选 100 条/页但只有 8 条数据时撑出 5000px 空白**）。

正确做法：`<el-table max-height="calc(100vh - 320px)">`。
EP 原生行为就是「内容超了才滚、表头固定；数据少就按实际行数收起」，不需要自己算。

### 8.2 单元格 nowrap 必须挂 `.cell` 且加 `:deep()`

```scss
// 无效：被 EP 自己的 `.el-table .cell { white-space: normal }` 覆盖
.el-table__cell { white-space: nowrap; }

// 有效
:deep(.el-table .cell) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

不修的表现：长姓名（`ABDURAXMONOV AKMALJON`）在 110px 列里被折成 3~4 行，行高 63/86/63 参差不齐。

### 8.3 列宽按内容分配，不要一刀切

26 列全设 110px 时，`A Michael Dsouza`、`外籍大客户经理`、`2026-11-11 16:27:10` 全被截。
按类型给：短数字 110 / 姓名·岗位 140 / 部门 160 / 时间 150 / 操作 150。

## 9. 整页滚动 vs 内层滚动（2026-11-13）

`.exam-layout` 曾锁 `height: 100vh` 且 `.exam-content` 是 `overflow: hidden`，
把内容困在视口内，导致下层只能「压扁」或「自己开滚动条」（滚起来别扭、分页条被推出视野）。

现在 `.exam-content` 是 `overflow-y: auto`，**业务页按自然高度铺开、整页滚动**。
新增页面不要再给根容器设 `height: 100%` + `min-height: 0`，那会重新制造「压扁」问题。

## 10. 详情页路由参数：必须 computed + watch（2026-11-13，同类错误犯了两次）

**症状**：在同一个详情页里切换 id（点考试历史、翻批阅队列），URL 变了但页面还是旧数据。

**两个必须同时做到**：

```ts
// ① 参数必须是 computed，不能写死成常量
const attemptId = computed(() => String(route.params.attemptId ?? ''))
// 所有用到的地方都要 .value：load()、提交接口、跳转拼串

// ② 必须有 watch，参数变化时重取（组件会被复用，onMounted 不会再跑）
watch(() => route.params.attemptId, (next, prev) => {
  if (!next || next === prev) return
  result.value = null        // 先清空，否则 loading 期间会闪上一份的数据
  void load()
})
```

**已经犯过的两处**：
- `MarkPaperPage.vue`（批阅页，2026-11-13 修）
- `ResultPage.vue`（结果页，2026-11-13 修）

**新增任何 `:id` 详情页时，默认就要写这两条**，不要等出问题再补。

### 排查提醒：先怀疑 Vite 模块缓存

改完代码页面没反应时，**先 `location.reload(true)` 硬刷新再排查代码**。
`curl` 查 dev server 会返回新代码（假阳性），只有页面内 `await import(...)` 才是运行时真值。
2026-11-13 我为这个问题多花了 3~4 轮去查模板、setupState、vnode，实际只是缓存。
