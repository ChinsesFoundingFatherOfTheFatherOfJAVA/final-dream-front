# 视觉契约（visual contract）

解决一个反复出现的问题：**做完一版页面，跟原平台差很远，每次都要人肉逐元素指出来再改。**

一代做法是「把看到的数值抄进契约，再拿契约比对」。它只能保证**数值**像，保证不了**结构**像——
契约只量已经存在的元素，所以当整个区域漏做（左栏四宫格统计、中栏三个快捷入口、进度条、查看全部）
时，审计照样全绿，等于没有报警器。

二代把它拆成两条独立流水线，期望值**从不手写**：

```
visual/captures/<page>.json   ← 人工写：去原平台量什么（探针清单）
        │  npm run visual:capture
        ▼
visual/measured/<page>.json   ← 脚本产出：原平台的真实数值（唯一可信期望源）
        │
visual/contracts/<page>.json  ← 人工写：原平台探针 → 本项目选择器 的映射 + 显式豁免
        │  npm run visual:audit
        ▼
visual/reports/<page>.{json,md,png}   ← 差异清单 + 本项目截图；不通过退出码 1
```

## 三层断言

| 层 | 抓什么 | 为什么必须有 |
| --- | --- | --- |
| 存在性 + 数量 | 整块区域漏做 | **唯一**能发现「这个区域根本没做」的一层 |
| computed 样式 | 尺寸/间距/圆角/字号/字重/行高/颜色偏差（数值 ±1px，颜色逐通道 ±2） | 结构对了但排版不对 |
| 文本 | 关键文案缺失或顺序错乱 | 元素在、字不在 |

## 用法

```bash
# 1) 先确保原平台登录态在 visual/.original-auth.json（见下）
npm run visual:capture                     # 量取全部页面
npm run visual:capture drillmate-home      # 只量一个

# 2) 本项目 3000 端口必须起着
npm run visual:audit                       # 比对全部契约
npm run visual:audit drillmate-runtime     # 只比一个
```

登录账号通过环境变量传入（默认 admin / Jack@123456）：

```bash
VISUAL_AUDIT_USER=admin VISUAL_AUDIT_PASS='Jack@123456' npm run visual:check
```

## 原平台登录态怎么来

`visual/.original-auth.json` 是 **localStorage 的整份键值**，不是只放 token——
只放 token 会落到「哎呀~没有访问权限~」页，而脚本会把那一页的空元素当成
「原平台没有这个元素」，静默删掉检查项。

在 ego 浏览器里（已登录原平台）取：

```js
js("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))")
```

写进 `visual/.original-auth.json` 即可。token 约 14 天过期，过期后重导一次。
该文件与两个 `.chrome-profile*` 目录都在 `visual/.gitignore` 里。

## 三条硬规则（踩过的坑）

1. **capture 必须响亮失败。** 登录态失效、页面没渲染完、探针选择器失效——
   任何一种都必须抛错退出，绝不能把 `exists:false` 写进 measured。
   否则「原平台没有」和「我量错了」就分不出来，后者会悄悄删掉检查项。
2. **量叶子元素，不量容器。** 组件库（Element Plus）的 padding 在 `.el-card__body` /
   `.el-select__wrapper` 上，量卡片根节点只会拿到 0；`el-select` 的原生 `<input>`
   也不是视觉外壳。
3. **刻意偏差要显式标，不能偷偷放宽。** 契约支持三个豁免口：
   - `countIgnore: true` —— 该元素数量随业务数据变化（卡片条数、表格行数）
   - `skipProps: ['color', ...]` —— 该属性随状态变化（通过/未通过配色、半透明背景）
   - `optional: true` —— 契约刻意不做（例如 01 §F02 明确「不展示段位」）

   每条豁免都要在 `desc` 里写清理由。全局放宽会让审计失去意义。

## 现有契约

> 「结果」列是**最近一次真实审计**的落盘结果（`visual/reports/<page>.json` 的 `passed` 与 `rows.length`），
> 不是手抄的乐观值。
>
> **2026-11-05 全量重跑：14 / 14 全部通过，0 非绿。** 这是 MySQL 恢复后的最终验收轮
> （11-04 那轮因 `10.100.26.200` 不可达、`/api/sm/auth/login` 500 而未能执行）。
> 本轮同时修复了 4 个此前不绿/未验证的页面，逐条原因见下方各节。

| 页面 | 契约 | 探针 | 结果 | 备注 |
| --- | --- | --- | --- | --- |
| 学员端首页 | `contracts/drillmate-home.json` | 39 | 通过（179 项，11-05） | |
| 主题详情 | `contracts/drillmate-theme-detail.json` | 26 | 通过（115 项，11-05） | |
| 练习历程 | `contracts/drillmate-history.json` | 25 | 通过（110 项，11-05） | 已补等待步（异步取数，原契约零等待会量到 loading 态） |
| 训练报告 | `contracts/drillmate-report.json` | 61 | 通过（309 项，11-05） | |
| 对练运行时 | `contracts/drillmate-runtime.json` | 32 | 通过（157 项，11-05） | 需活练习：建 `in_progress` attempt 后**立刻**跑（15 分钟自动结束） |
| 管理端主题详情 | `contracts/admin-theme-detail.json` | 40 | 通过（231 项，11-05） | |
| 管理端场景单元管理 | `contracts/admin-scenario-units.json` | 15 | 通过（88 项，11-05） | |
| 管理端训练主题列表 | `contracts/admin-topic-list.json` | 32 | 通过（196 项，11-05） | |
| 管理端主题设置 | `contracts/admin-theme-settings.json` | 87 | 通过（483 项，11-05） | |
| 管理端版本历史 | `contracts/admin-version-history.json` | 18 | 通过（99 项，11-05） | |
| 管理端数据分析 | `contracts/admin-data-analysis.json` | 61 | 通过（399 项，11-05） | 见下「数据分析：count 与一处真实样式偏差」 |
| 管理端学员面板 | `contracts/admin-student-panel.json` | 9 | 通过（33 项，11-05） | **首次出报告**，见下「学员面板首次验证」 |
| 学员端材料查看 | `contracts/drillmate-file-viewer.json` | 4 | 通过（7 项，11-05） | |
| 学员端场景准备弹窗 | `contracts/drillmate-scenario-prepare.json` | 17 | 通过（44 项，11-05） | 见下「场景准备弹窗曾量错对象」 |

### 学员面板首次验证（11-05，最高风险页）

t7 在 11-04 把该页从「8 个 optional 的 `any-*`（量任意元素含页头导航，永不报错）」收紧为
9 个 required 精确锚点，但**一次都没跑过**。本轮首次跑出报告，结果：

- 9 个锚点中 **8 个直接命中**（`.dm-learner` / `__toolbar` / `__table th|td|tbody tr|.el-checkbox` / `__pager`）
- 唯一失败项 `learner-search-input.count`：期望 4、实际 1

**判因：契约写法错误，不是实现缺陷。** 证据链：
1. 契约原写 `skipProps: ["count"]`，但审计脚本的 `skip` 集合**本就默认含 `count`**，
   数量比对只认 `countIgnore` → 该写法**无效**，导致作者"不比对数量"的意图没生效；
2. 原始 capture 文件作者自述：「面板内带 placeholder 的 input 有 4 个（搜索/部门/状态/分页），
   **数量随筛选控件增减，故数量不比对**」；
3. 本项目把部门/状态收敛成下拉、分页用 `el-pagination`，所以只剩 1 个原生搜索框——
   这是**布局实现差异**，不是结构缺失（容器 `.dm-learner__search` 与 input 都存在）。

**处置**：把无效的 `"count"` 移出 `skipProps`，改用它本意的 `countIgnore: true`，并在 `desc` 写明原因。
未降低其他断言（`width` 仍跳过是因为原平台 256 是含图标的容器宽，本项目 input 本体宽不同）。

### 数据分析：count 与一处真实样式偏差

11-04 该页 FAIL（295 项）。本轮修复两类：

**① 11 个 count 差异 = 数据形态差异，不是结构缺失。**
`distbar`(期望3/实际1)、`seg`/`seg-weak`/`bandnote`(期望3/实际1)、`band*`(期望9/实际3)。
接口实测（带 token）`/analysis` **返回 code=0 且数据完整**，只是本主题真实数据里
**4 个维度只有 1 个有掌握分布**（其余 3 个 `empty=true`），所以非零分段只有 1 段。
契约 `desc` 本就写着「当前真实单元无掌握分布数据时不渲染」，但没写 `countIgnore` —— 与学员面板同性质
的写法遗漏。已给这 11 个探针补 `countIgnore: true`。

**② `cv-delta.width` 64→72 是真实样式偏差，修了实现。**
`DataAnalysis.vue` 的 `.change-delta` 写死 72px，原平台实测 64px。已改为 64px（含注释说明依据）。
**没有**用"改契约迁就实现"的方式绕过。

### 练习历程：异步取数需要等待步

11-05 首跑时 8 项全红（`row`/`cell-*` 全缺失）。截图显示页面停在 **loading 转圈**、
统计卡全是「0 次 / 0h / 0 个」——即审计在 `practice-records` 请求返回前就量了。

契约原本 `steps: []`（零等待）。已加 `steps: [{ wait: 4000 }]` 等首屏请求返回。
**注意**：审计脚本的 `steps` 只识别 `click`（每步后统一 `await wait(step.wait)`），
不识别 `waitFor` 之类的字段，所以写纯 `wait` 步即可。

### 场景准备弹窗曾量错对象（台账点名的假通过，已修）

旧契约量的是 `.dm-check-dialog`(480×571)——那是 **F10 模式选择弹窗**；F09 场景准备弹窗实际是
`.dm-check-dialog--prepare`（`.el-overlay-dialog .dm-check-dialog--prepare`，**800×627**）。
旧 `steps` 第二步「点案例卡开始练习」把 F09 关掉、打开了 F10，
于是 79 项数值全过，却测不出 F09 九类信息整块缺失。

新契约只点场景按钮直量 F09（`.dm-scene__btn` → `.dm-check-dialog--prepare`），
17 个探针 ⇄ measured 17 个一一对应。本轮（11-05）复验通过 44 项，
其中 5 项样式偏差是**真实实现问题、已修**：

| 探针 | 属性 | 原平台 | 本项目(修前) | 处置 |
|---|---|---|---|---|
| `dialog` | radius | 14 | 16 | 改 `.dm-check-dialog--prepare` 圆角为 14 |
| `title` | lineHeight / color | 21 / #595959 | 28 / #262626 | `.dm-prep-title` 按基准改（原按"大标题"写成 20px/700） |
| `action-cancel` | height / radius | 32 / r4 | 36 / r6 | `.dm-prep-btn` 改为 32 高、r4 |

**没有**通过改契约来迁就这 5 项。

契约补齐的存在性探针：三类练习入口
（`dm-case-card__start`/`dm-prep-btn--ghost`/`dm-prep-btn--primary`）、案例卡、产品档案块、
评估标准块、业务填充块。

**因数据不足标 `optional`（写明理由，未删检查项）**：
- `product-profile-block`：该主题未关联产品档案
- `action-random` / `action-custom`：按 `practiceMethods` 动态渲染

### 数据分析的选择器收窄（`count=2` 误判已坐实）

`.fs-insight-scope-label` 实地命中 2 个，第二个的父节点是 `.fs-insight-cv-endpoint`（对比终点）——
**是类名复用，不是两个统计范围**；`.fs-insight-scope-sel` 同样被共用。

处理：capture 收窄到作用域后四个选择器各自 `count=1`；契约 `scope-label` 收紧到
`.scope-row .scope-label`，并新增 `cv-endpoint-label` 探针，两个控件各自独立可比。

顺带修掉真实偏差：`.cv-endpoint__label` 原 400/#595959 → 原平台实测 **600/#262626**。

> 该页 11-05 已通过（399 项）。此前 FAIL 的两类原因（count 基于 mock 形态 + 一处 64/72 宽度偏差）
> 已分别处置，见上文「数据分析：count 与一处真实样式偏差」。

### 学员面板契约已精确化

旧版 8 个 `any-input`/`any-th`/`any-tr`/`any-button` **全部 optional**——量的是页面上任意元素
（含页头导航），既定位不到学员面板又永不报错，性质同假通过。

重写为精确锚点：`.theme-detail-comp-learner` / `.yxt-table__header th:nth-child(3)` /
`.yxt-table__body tbody tr` / `.yxt-checkbox__inner` / `.yxt-pagination` 等，**全部 required**，实测已采（9 探针）。

## 需要交互才渲染的页面

`contracts.steps` 支持在审计时先点击本项目元素再量取（格式与 captures 的 steps 相同）：

```json
"steps": [{ "click": ".dm-scene__btn", "wait": 1500 }]
```

步骤里的选择器是本项目选择器，会等它出现后再点；未命中直接报错，不会静默跳过。
captures 的 steps 只用于原平台，两者不要混写。

## 需要活数据的页面

有些页面的 URL 里带着会过期的业务记录（运行时页的 `attemptId` 就是如此）。契约里写死 id
会让全量回归必然失败，所以改用 `pathFrom` 在审计时现查一条真实记录：

```json
"pathFrom": {
  "url": "/api/act/student/history?page=1&pageSize=5",
  "match": { "status": "in_progress" },
  "field": "attemptId",
  "template": "/#/sparring/web/drillmate/attempt/{value}"
}
```

查不到匹配记录时直接报错，不会退化成"整页缺失"。练习 15 分钟自动结束，所以长时间不跑
之后需要先创建一条新练习，或用下面的显式跳过：

```bash
VISUAL_SKIP=drillmate-runtime npm run visual:check
```

跳过会打印页面名，不会静默吞掉；也不允许为了过闸门去删数据或改基准。

## 登录态注入

`visual-audit` 先导航到登录页、调接口取 token 写入 `localStorage.final_dream.auth`，
然后**强制 reload 一次**再确认已离开 `#/login`。少了这一步，全新 Chrome profile
第一次跑会停在登录页、整页探针全判缺失（跑第二次才正常）。

## 已知边界

- 原平台的渐变、半透明背景在 measured 里会丢 alpha（capture 只保留前三个通道），
  这类探针必须 `skipProps: ['background']`。
- 报告页与运行时页在原平台是**独立路由**（`/drillmate/drill/...`），不是 SPA hash 路由；
  抓它们要直接开那个 URL，不要点进去。
- 本项目的 contracts `path` 必须是 `/#/...`（hash 路由）。写漏 `/#` 会打开首页，
  导致全部探针被判「整块区域缺失」。
- 运行时页需要有一个 `in_progress` 的 attempt 才能渲染；契约用 `pathFrom` 现查，
  查不到时见上文「需要活数据的页面」。
- Element Plus 弹窗被 teleport 到 body，**scoped 样式匹配不到弹窗根节点**。
  调整弹窗自身尺寸/圆角/内边距要写在非 scoped 块里（用专属类名限定范围）；
  只改内部子元素时 scoped + `:deep()` 仍然有效。
- 学员端材料页依赖发布快照 `act_content_version_material`；发布时若没有把学员可见材料
  写进快照，主题详情 `materials` 与材料查看页会同时为空。发布逻辑已修，历史主题用
  `after-end/AtualCombatTraining/db/08-backfill-version-material-snapshot.sql` 回填。
