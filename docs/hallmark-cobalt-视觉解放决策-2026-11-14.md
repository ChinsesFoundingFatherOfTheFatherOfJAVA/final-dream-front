# 视觉解放决策（2026-11-14）

> 位置说明：本文件应并入 `D:/JACK/plan/前端ElementPlus全量重构/01-重构任务书.md`（会话沙箱对 plan 仓库无写权限，由 captain 代为合并）。

Hallmark 试点（Coral→Cobalt）跑通后全站铺开完成，本节记录铺全站时定下的视觉决策口径，后续页面设计以本节为准：

1. **主题两换**：P1 期定的 Coral（珊瑚）经用户验收反馈换为 **Cobalt**（钴蓝，cobalt.md 规范）。主色 `--color-accent: oklch(52% 0.185 258)`，token 层 `src/assets/styles/hallmark-tokens.scss`（oklch 全套 paper/ink/rule/graphite/accent/glyph 系）。
2. **单信号色纪律**：钴蓝只做信号（主按钮/激活态/链接 hover/记分牌数字），页面 <5% 面积；语义色三族（success/warning/error）经 element-theme 冷区校准保留。
3. **按钮形态分级**：实心键帽（3px 底边 `--shadow-key`，按压 `--shadow-key-press` 下沉）只给 primary；plain = wash 底+deep 字；link/text 禁底色，hover 只字色。禁渐变按钮/禁 pill chip/禁暖 accent（cobalt.md Do-nots）。
4. **交互语境区分**：点击反馈=字色/信号条；按压反馈=键帽下沉；列表行 hover=wash 不抬升；侧栏宽行 hover=wash+抬升 1px。激活态导航项=deep 字+下边信号条+600 字重，全程无底色块。
5. **表格三件套**：表头 paper-2 灰底+500 字+44px；行 hairline 分隔+44px+hover wash；`:deep(.el-table .cell)` nowrap（细节见 AGENTS.md §8）。
6. **记分牌**：大数字 Familjen Grotesk 600 ≥48px tabular-nums（页面最响类型），单位/机器值 JetBrains Mono 小号；统计卡挂 `.cut` 切角+顶部 2px 族标色条。
7. **材质纪律**：graphite 深板一页最多一块（CTA/重点面板）；切角面板全局 `.cut`（corner-shape: bevel 渐进增强）；ASCII field 用 `hallmark-field.ts`（canvas 生成式 8×16 cell，登录页已上场，hero 位不强插）。
8. **图标纪律**：象形 emoji 全站清零，一律 `@element-plus/icons-vue`；排版字符（✓✗✦）保留。
9. **已登记例外**（存量裸色待专项清理，sloplint 全站 581 FAIL 分布）：FlowDesign 系（NodeConfigPanel/AIGenScriptDialog/aiGen 四步/nodes/EdgeWeightDialog/AvatarGenField/TemplateImportDialog，约 430 条）+ AGENTS §4 UI 例外清单；其余域 token/emoji 已清零（抽查 views/{admin,student}/AICombat、exam、onlineclassroom 的 FAIL 均为结构 gate（4/10a/19/27/33/39a），非裸色/emoji 回潮）。
10. **验证口径**：sloplint Floor（试点域 0 FAIL 门槛）+ check-sfc 全量 214/214 + vitest 27 spec/374 用例 + vue-tsc 双 project 0 错 + 截图核对三件套一致性。

## 全站收口回归记录（t25，2026-11-14）

- sloplint src/ 全量：581 FAIL / 1519 REFLEX / 155 WARN across 214 files。FAIL 分布：components/business/*（FlowDesign 系已登记例外）约 430；试点/铺全域 FAIL 全部为**结构 gate**（卡片套卡片 4/宽度过渡 10a/破折号 19/reduced-motion 27/svg aria 33/em-in-h2 38i/焦点环 39a 等），**token 三 gate（7a 纯白/30a emoji/48 裸色）在声明已清域仅 34 条**，其中 11 条在 DeptTree.vue（common/，未在任何 t20-t24 域清单内）——已记入铺全站遗留清单。
- 铺全站轮修复的阻断性损伤 3 处（t23/t24 扫描工具误伤，已由 reviewer 修复）：PaperQuickEditPage.vue TYPE_BUTTONS 重复声明+孤立 ]；MessageBubble.vue/ProductProfilePanel.vue/DetailHeader.vue 图标 import 插入多行 import 块中间；hallmark-field.ts canvas fillStyle undefined 类型错（2 处 noUncheckedIndexedAccess）。
- vitest 27 files/374 tests 全绿；vue-tsc app+node 双 0 错；check-sfc 214/214 ✓。
- 截图墙 12 张 → .hallmark/shots/site-*.png（首页/员工名册/角色权限/部门树/考试管理/批阅列表/题库/课件/课程/学员考试/控制台），Cobalt 三件套（paper-2 表头+hairline 行+hover wash）全站一致，无 EP 默认蓝残留、无 emoji。
