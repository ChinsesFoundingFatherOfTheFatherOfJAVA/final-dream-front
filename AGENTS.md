# AGENTS.md · front-end（杰克数字人陪练平台 · 复刻平台前端）

## 1. 应用定位

全站唯一前端工程（Vue 3 SPA，hash 路由），覆盖管理端与学员端：
组织架构/员工名册/角色权限（/enterprise）、在线课堂（/kng/**）、AI实战训练场与话术训练管理端（/sparring/**）、
学员端训练与报告（/web/**）。所有 HTTP 经统一 `/api` 前缀走网关（8080）。

## 2. 技术栈与结构

- Vue 3.5（`<script setup>` + TS）· Vite 8 · Element Plus · Pinia · vue-router（hash 模式）· vue-flow（流程设计器）· echarts · axios。
- 目录：`src/api`（按后端模块拆分的请求封装）、`src/views`（admin / student / onlineclassroom / auth）、
  `src/components/layout`（AdminLayout/EnterpriseLayout/TopNav）、`src/stores`（auth/training）、`src/utils`、`src/mock`、`src/types`。
- 测试：Vitest + @vue/test-utils（`npm run test`）；类型检查 `vue-tsc`（`npm run build` 自带 type-check）。

## 3. 铁律（违反即返工）

1. **请求一律走 `src/api/request.ts`**（axios 实例，baseURL `/api`）：
   - 请求拦截器统一附 `Authorization: Bearer <token>`（网关边缘鉴权依赖它，缺头会被 401 拦截）；
   - 响应拦截器统一解 `{code,message,data}`：code=0 返回 data；40101/401001 清凭证跳登录；403xx 跳无权限页；
     HTTP 401/403（网关直返）同口径处理；
   - `silent: true` 供"失败不打扰用户"的调用（如详情页说明性请求）；
   - **禁止**在组件里直接 new axios/fetch 调后端，禁止绕过拦截器吞掉 code≠0。
2. **静态资源 URL 用 `resolveAssetUrl()`** 补全（`/coverImage/**`、`/audio/**`、`/avatar/**` 经网关前缀访问）；
   不要手拼后端地址。
3. **类型契约**：新增接口先在 `src/types/*.ts` 补类型，`src/api/*.ts` 按后端模块一一对应
   （sm→StaffManagement、act→AtualCombatTraining、kng→OnlineClassroom、student/speechAdmin→SpeechTraining）。
   后端 id 全部是 string，前端类型用 `ID = string`，不要把 id 当 number。
4. **WebSocket**：AI 助手 WS 直连 8082（网关 WebMVC 版不支持 WS upgrade，见 vite.config.ts 代理注释与
   `复刻平台前端/AI助手WS接入说明.md`）；不要试图把 WS 收进网关路由。
5. **路由权限**：`meta.requiresAuth / requiresAdmin / permission`（如 `kng:courseware`、`sparring:manage`），
   守卫在 `src/router/index.ts`；新增页面必须声明 meta，超管豁免逻辑在 auth store 的 `hasPermission`。
6. **后端契约口径**：统一 `ApiResponse{code,message,data}`、code=0 成功、业务失败 HTTP 200 + 非零 code；
   分页有两种历史形状——ST/ACT 的 `PageResult{records,total}` 与 SM 的 `PageVo{list,total,page,size}`，
   封装 API 时按后端实际返回建类型，不要想当然。

## 4. 已知事项与约定

- **mock 数据边界**：`src/mock/data.ts` 仅剩静态导航注册表用途（TopNav/AdminTopNav 的 `mockApps`）；
  学员端"我的练习"页（MyPractice.vue）已于 2026-10-02 接入 `getStudentProjects` 真实接口，
  侧边栏勋章/经验值/积分仍是静态展示，待产品确认口径。
- **ACT_USE_MOCK**（`src/api/actTheme.ts`）已固定 false；mock 函数保留用于离线开发，禁止把开关改回 true 提交。
- dev 代理在 `vite.config.ts`：`/api/act/ws` → ws://localhost:8082（WS 直连）、其余 `/api` → 网关 8080，
  可用 `VITE_PROXY_TARGET` / `VITE_SM_PROXY_TARGET` 环境变量覆盖。
- token 存 localStorage（`final_dream.auth`）；JWT 12h 过期，过期统一走 401 分支跳登录。
- 仓库卫生（2026-10-02）：`.mimosa/`、`test-results/` 已加入 `.gitignore` 并移出索引；
  源码树内的《复刻平台前端》《复刻话术训练模块》文档目录已迁至 `D:\JACK\plan` 仓库。

## 5. 构建与验证

- `npm run test`（vitest，当前 21 个用例必须全绿）；`npm run build`（含 vue-tsc type-check）通过后再提交。
- 本地联调：后端网关 8080 + ACT 8082（WS）在跑即可 `npm run dev`（端口 3000）。
- 提交前跑 `npm run format`（prettier），不要提交与本次改动无关的大面积格式化。

## 6. 工作方式

1. 代码实施过程中出现技术或逻辑修改，要及时将技术方案文档同步修改。
2. 关键类、方法、代码行要加上标准的描述功能或步骤的注释（中文，说明"为什么"，不是复述代码）。
3. 出现信息缺失或认为实现方案不合理的情况一定要和用户沟通确认！！！
