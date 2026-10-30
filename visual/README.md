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

| 页面 | 契约 | 探针 | 结果 |
| --- | --- | --- | --- |
| 学员端首页 | `contracts/drillmate-home.json` | 39 | 通过（179 项） |
| 主题详情 | `contracts/drillmate-theme-detail.json` | 27 | 通过（115 项） |
| 练习历程 | `contracts/drillmate-history.json` | 24 | 通过（110 项） |
| 训练报告 | `contracts/drillmate-report.json` | 61 | 通过（309 项） |
| 对练运行时 | `contracts/drillmate-runtime.json` | 32 | 通过（157 项） |
| 管理端主题详情 | `contracts/admin-theme-detail.json` | 40 | 通过（231 项） |
| 管理端场景单元管理 | `contracts/admin-scenario-units.json` | 15 | 通过（88 项） |
| 管理端训练主题列表 | `contracts/admin-topic-list.json` | 32 | 通过（196 项） |
| 管理端主题设置 | `contracts/admin-theme-settings.json` | 87 | 通过（483 项） |
| 管理端版本历史 | `contracts/admin-version-history.json` | 18 | 通过（99 项） |
| 管理端数据分析 | `contracts/admin-data-analysis.json` | 60 | 通过（359 项） |
| 学员端材料查看 | `contracts/drillmate-file-viewer.json` | 4 | 通过（7 项） |
| 学员端场景准备弹窗 | `contracts/drillmate-scenario-prepare.json` | 11 | 通过（79 项） |

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
