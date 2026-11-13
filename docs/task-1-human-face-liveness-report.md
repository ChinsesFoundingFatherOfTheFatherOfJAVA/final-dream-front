# task-1 结案报告：引入 @vladmandic/human 并封装人脸检测原语

> 交付物：`front-end/src/views/exam/student/faceLiveness.ts` + `faceLiveness.spec.ts` + `front-end/public/models/`
> 下游依赖本报告的字段名、单位、极性三件事——**尤其是极性，读反了功能会整体失效**。

---

## 1. 验收结果（全部实跑）

| 命令 | 结果 |
|---|---|
| `npm run type-check` | ✅ 通过（`vue-tsc --build` 无输出，exit 0） |
| `npm run test` | ✅ **25 文件 / 333 用例全绿**（基线 24/298，我新增 1 文件 / 35 用例） |
| `npm run build-only` | ✅ `✓ 2970 modules transformed. ✓ built in 10.24s` |

`npm run test` 原始输出：

```
 Test Files  25 passed (25)
      Tests  333 passed (333)
   Start at  12:12:28
   Duration  92.44s
```

新增的 35 个用例单独跑：

```
 Test Files  1 passed (1)
      Tests  35 passed (35)
      src/views/exam/student/faceLiveness.spec.ts
```

> ⚠️ 中途有一次 `npm run test` 报 `livenessChallenge.ts` 编译失败（`const open` 重复声明）。
> 那是 **task-2 当时正在编辑该文件的中间状态**（该行随后被改成 `const openStreak`），
> 与本任务改动无关；task-2 落定后重跑即全绿。

---

## 2. 模型文件最终存放路径

**`front-end/public/models/`**（构建后原样复制到 `dist/models/`，已实测存在）

```
public/models/blazeface.json    79,038 B
public/models/blazeface.bin    538,928 B
public/models/facemesh.json     95,845 B
public/models/facemesh.bin   1,477,958 B
                            ─────────────
                            合计 2,191,769 B ≈ 2.1 MB
```

来源：`node_modules/@vladmandic/human/models/`（随 npm 包下发，无需联网下载）。
只拷 **4 个文件**：检测框模型 blazeface + 468 点关键点模型 facemesh，json 与同名 bin **必须同目录同名前缀**。

**没有拷**：iris(2.6MB)、faceres(7MB)、antispoof(853KB)、liveness(593KB)、emotion、centernet、movenet、
handtrack、handlandmark。这些在配置里全部 `enabled: false`，不加载就不需要文件。
（`public/models/` 是新增目录，未加 .gitignore，会随源码入库——2.1MB 静态资源，这是有意为之。）

---

## 3. 离线加载：**已验证**，怎么验证的

### 配置

```ts
modelBasePath: '/models/'
```

human 默认是 `'../models/'`（**相对当前页面路径**，不是工程根；源码 `src/human.ts:143`）。
hash 路由下这个相对路径会解析到错误目录。改成绝对路径 `/models/`，与部署子路径无关。

拼接规则（源码 `src/tfjs/load.ts:loadModel` + `src/util/util.ts:join`）：

```
最终 URL = modelBasePath + modelPath      // util.join 只补一个 '/'
例：'/models/' + 'blazeface.json' → '/models/blazeface.json'
权重  = 同目录、同前缀的 .bin（从 json 的 weightsManifest 读，相对 json 所在目录）
```

### 验证方法（真浏览器，不是推断）

写了一次性探针：本地 http 服务（`public/models` 作为站点根）+ headless Chrome + CDP 取结果，
页面里 `new Human({modelBasePath:'/models/'}).load()` 后 `detect()` 一张真实人脸图。实跑输出：

```json
{
  "ok": true,
  "backend": "cpu",
  "loadedModels": ["blazeface", "facemesh"],
  "modelStats": [
    { "name": "blazeface", "loaded": true, "bytes": 538928 },
    { "name": "facemesh",  "loaded": true, "bytes": 1477958 }
  ],
  "faceCount": 1,
  "error": null,
  "gesture": [{ "face": 0, "gesture": "facing center" }],
  "rotation": { "pitch": 0.05346, "yaw": 0.02999, "roll": -0.03602 },
  "eyeRatioLeft": 0.4138,
  "eyeRatioRight": 0.4074,
  "meshLength": 468,
  "boxScore": 0.9
}
```

`bytes` 与磁盘文件字节数**完全一致**，说明本地 2 个模型 + 2 个权重真的从 `/models/` 读到了，
没有回落到 CDN，也没有出现「静默加载失败」。探针产物已删除，不入库。

### 为什么必须做「加载后校验」（最容易翻车的地方）

**human 模型加载失败不抛异常**。源码 `src/tfjs/load.ts` 里 `catch` 之后只 `log` 一行，
照常返回一个没加载成功的 `GraphModel`。业务侧看到的现象是「永远检测不到脸」，
与「摄像头坏了」无法区分，学员会以为设备故障。

所以 `loadHuman()` 在 `instance.load()` 之后额外做了：

```ts
const missing = findMissingModels(instance.models.stats())  // 校验 blazeface/facemesh 的 loaded 标志
if (missing.length > 0) throw new Error(`人脸模型加载失败：${missing.join('、')}...`)
```

把静默失败重新变成可 catch 的显式错误。有单测覆盖（`模型没真的加载上时抛错`）。

---

## 4. 精确签名与最小调用示例

### `loadHuman(): Promise<Human>`

```ts
export function loadHuman(): Promise<Human>   // Human 来自 `import type Human from '@vladmandic/human'`
```

- **单例 + 并发去重**：缓存的是 Promise 而非实例，并发调用只构造一次（单测断言 `toHaveBeenCalledTimes(1)`）。
- **失败可重试**：reject 时清空缓存，下次调用重新加载（否则一次网络抖动就把页面永久废在 rejected Promise 上）。
- **模型缺失抛错**：见上节。
- 用动态 `import()`，Vite 会拆成独立 chunk（实测 1,897 KB / gzip 445 KB），不拖累非考试页面的首屏。

### `detectOnce(video): Promise<LivenessFrame>`

```ts
export async function detectOnce(
  video: HTMLVideoElement | null | undefined
): Promise<LivenessFrame>
```

- **永不抛异常**。视频没就绪 / 模型没加载 / 检测内部报错，一律返回 `faceCount = 0` + `error` 文案。
- **内部串行化**：human 的 `detect` 会改写实例状态，并发调用会互相踩。前一次没完成时本次排队等待。
- 视频 `readyState < 2` 或宽高为 0 时**直接返回，不调 human**（避免拿空画面去检测）。

### `LivenessFrame`（对外全部契约）

```ts
export interface LivenessFrame {
  faceCount: number          // 人脸数；0=没人脸，>1=替考/围观信号
  yaw: number                // 头部左右转角，**弧度**
  roll: number               // 头部倾斜，**弧度**
  pitch: number              // 头部俯仰，**弧度**
  openLeft: number           // 左眼**睁眼度**，越小越闭；取不到时是 NaN
  openRight: number          // 右眼**睁眼度**，口径同上
  blinkLeftGesture: boolean  // human gesture 命中 'blink left eye'
  blinkRightGesture: boolean // human gesture 命中 'blink right eye'
  blinkGesture: boolean      // 任一眼命中
  error: string | null       // 本帧异常说明，正常为 null
}
```

### 最小调用示例（下游状态机照这个写）

```ts
import { detectOnce, loadHuman, HUMAN_BLINK_THRESHOLD } from '@/views/exam/student/faceLiveness'

const video = videoRef.value!                       // srcObject 已接上 MediaStream

await loadHuman()                                   // 可选：提前预热，失败会 throw，建议 try/catch

let raf = 0
const tick = async () => {
  const frame = await detectOnce(video)             // 必须 await，内部串行
  if (frame.error) console.warn(frame.error)        // 不抛，自己决定要不要计入失败

  if (frame.faceCount === 0) { /* 学员离开画面 */ }
  else if (frame.faceCount > 1) { /* 多脸，记证据 */ }

  // ★ 极性：睁眼度越小越闭
  const leftClosed  = Number.isFinite(frame.openLeft)  && frame.openLeft  <= HUMAN_BLINK_THRESHOLD
  const rightClosed = Number.isFinite(frame.openRight) && frame.openRight <= HUMAN_BLINK_THRESHOLD

  // 转头：yaw 是弧度。0.5 rad ≈ 28.6°，是「明显转头」的量级；误当角度看会差 57 倍
  const turned = Math.abs(frame.yaw) > 0.5

  raf = requestAnimationFrame(tick)
}
raf = requestAnimationFrame(tick)
```

---

## 5. blink / yaw 字段实际叫什么、取值范围（**下游阈值直接依赖这段**）

### 眨眼：human **没有** `blink` 数值字段

| 项目 | 实际情况 |
|---|---|
| 字段位置 | `result.gesture[].gesture`，字符串枚举 `'blink left eye'` / `'blink right eye'` |
| human 判据 | 源码 `src/gesture/gesture.ts:face`，`openRatio < 0.2` 即 blink（**写死，不可配**） |
| 官方数值字段 | **不存在**。`FaceResult` 里没有 blink/eyeOpenness 之类 |

**这就是本任务最大的坑**：human 只给二值字符串，没有连续值。

我们自己在适配层用**同一组关键点、同一条公式**算出连续值：

```
openLeft  = |mesh[374].y - mesh[386].y| / |mesh[443].y - mesh[450].y|
openRight = |mesh[145].y - mesh[159].y| / |mesh[223].y - mesh[230].y|
```

**极性：这是「睁眼度」，值越小越闭。** 分母是眼眶上下缘间距（相对稳定），
分子是睑缘中点间距（睁眼时张开、闭眼时趋近 0）。

实测取值范围（真浏览器 + human 内置 warmup 样例人脸 + 正对镜头 + 睁眼）：

| 指标 | 左眼 | 右眼 |
|---|---|---|
| 睁眼实测值 | **0.414** | **0.407** |
| human 闭眼线 | < 0.2 | < 0.2 |

即：正常睁眼约 0.40~0.42，闭眼趋近 0。**不是 0~1 的均匀分布，也不是「睁眼=1」**。

### ⚠️ 极性坑（本任务实际踩到并修正的）

接口最初设计成 `blinkLeft/blinkRight` 表示「闭合度 0~1，1=闭」，实现里做了 `1 - openRatio` 映射。
**这个设计是错的**，两个原因：

1. **极性相反**：直接把 openRatio 塞进「闭合度」字段，睁眼会被读成闭眼（openRatio 大 = 睁）。
2. **`1 - x` 也不可靠**：human 只保证「< 0.2 算闭」这半条判据，**从未保证睁眼时接近 1**。
   实测睁眼 0.414 → `1 - 0.414 = 0.586`，恰好落在状态机 0.6 进入 / 0.3 退出的滞回带里，
   `eyesArmed` 永远不成立，**诚实学员 100% 超时**。

最终方案（已与 lead 对齐）：**不做任何映射猜测，直接暴露原始 `openLeft/openRight`**，
让状态机复用 human 已验证的 0.2 阈值。同时把 `blinkLeftGesture/blinkRightGesture/blinkGesture`
三个布尔量一并输出，作为二值兜底 + 交叉验证信号。

**为防回归**，spec 里有专门的「眨眼极性」describe 块：
- 用实测真值 0.414/0.407 断言睁眼时 `openLeft > 0.2`
- 单调性断言：`closed.openLeft < open.openLeft`（改成 `1-x` 立刻红）
- 断言输出里**不存在** `blinkLeft`/`blinkRight` 字段（旧命名会误导下游）

### 取值缺失时的语义

关键点不足 468 或眼眶间距为 0 时，`openLeft/openRight` 输出 **`NaN`，不是 0**。

原因：0 会被读成「眼睛完全闭上」，等于**免费送一次眨眼成功**。`NaN` 参与 `<` 比较恒为 false，
任何判据都不会误触发。下游要显式区分时用 `Number.isFinite(frame.openLeft)`。

### yaw / roll / pitch

| 项目 | 实际情况 |
|---|---|
| 字段路径 | `face.rotation.angle.{yaw,roll,pitch}` |
| **单位** | **弧度（radian）**，不是角度 |
| 取值范围 | 理论 -π/2 ~ π/2（-90° ~ 90°）；实际正对镜头约 ±0.05 |
| 何时缺失 | mesh 点数 ≤ 200 时 human 不计算，`rotation` 字段不存在 → 我们输出 0 |

证据：依赖自带 demo `demo/facedetect/facedetect.js:78-81`
`const deg = (rad) => Math.round((rad || 0) * 180 / Math.PI)` —— 说明原始值是弧度。
实测正对镜头：`pitch 0.0535 / yaw 0.0300 / roll -0.0360`（弧度），换成度数约 3.1° / 1.7° / -2.1°，合理。

**转头阈值建议**：`|yaw| > 0.5 rad`（≈28.6°）算「明显转头」，`> 0.35 rad`（≈20°）算「轻微转头」。

---

## 6. Vite 配置结论（task-3 会用）

**`vite.config.ts` 零改动。** 不需要 `optimizeDeps.exclude`，不需要 worker 配置。

依据（实跑，非推断）：
1. **human 的 ESM 产物是自包含单文件**：`dist/human.esm.js` 里 `grep -c "^import "` = **0**，
   TFJS 已内联。没有裸模块说明符，Vite 预打包/解析不会出问题。
2. **实跑打包验证**：临时 lib 模式 entry 只 import 我的模块 → `✓ built in 1.29s`，
   产出 `human.esm-DEK5QoH-.js  1,897.41 kB │ gzip: 444.98 kB`，无告警。
3. **`npm run build-only` 全量构建通过**，`dist/models/` 4 个文件正确落位。

唯一注意：**用动态 `import()` 而非顶层 import**，让 human 进独立 chunk。
顶层 import 会让它落进主 chunk，所有页面（含压根不考试的）都白背 1.9MB。
（当前 `dist/assets/index-*.js` 是 824KB，比 human chunk 还小——说明它确实没进主包。）

---

## 7. 模型体积与加载时间取舍

| 模型 | 大小 | 是否启用 | 理由 |
|---|---|---|---|
| blazeface | 539KB | ✅ | 人脸检测框，「画面里有几张脸」只能靠它 |
| facemesh | 1.5MB | ✅ | 468 点关键点，眨眼/转头都从它算 |
| iris | 2.6MB | ❌ | 只看眨眼不需要虹膜；省 2.6MB |
| faceres | 7MB | ❌ | 人脸特征比对，本期不接 CompreFace |
| antispoof | 853KB | ❌ | 防照片攻击，动作式活体已覆盖需求 |
| liveness | 593KB | ❌ | 同上 |
| emotion / centernet / movenet / handtrack / handlandmark | — | ❌ | 与人脸核验无关 |

合计 **2.1MB**（只开必要模型）。若全开默认配置会到 **15MB+**。
`warmup: 'none'`：human 默认 warmup 会拿内置样例图完整跑一遍检测，白等 1~2 秒；
核验弹窗一打开就开摄像头，第一帧本身就是最好的预热。

配置里还有一个刻意偏离默认值的项：`detector.maxDetected` 从默认 **1** 改成 **4**。
默认值会把画面裁成 1 张脸，那样「画面里有两个人」永远发现不了，替考检测直接失效。

---

## 8. 需要下游知道的两个行为约定

1. **`faceCount = 0` 不是「安全」，是「没信息」**。状态机需要自己决定把「连续多帧 0 张脸」
   当成学员离开画面，还是当成检测失效。本模块不替你做这个判断。
2. **多脸时姿态只取第 0 张脸**（human 已按置信度排序），但 `faceCount` 如实上报全部数量。
   替考判定用 `faceCount`，姿态判定用主脸。

---

## 9. 未做的事 / 已知局限

- **未做真机摄像头标定**。实测数据来自 human 内置 warmup 样例图（正对镜头、光照良好、单人），
  不是考场真实 webcam。真机因分辨率/距离/光线差异，睁眼值会在这个值附近漂移。
  因此**没有把 0.41 用于任何归一化**（`OPEN_EYE_REFERENCE` 只作文档与排查用，不参与判定），
  判定完全沿用 human 的 0.2。如果后续要更精细的阈值，需要拿真机摄像头采一组睁眼/闭眼分布。
- **未在真机上验证眨眼能否被触发**（需要物理摄像头 + 真人）。已验证的是：
  样例人脸睁眼时 openLeft=0.414 远高于 0.2 阈值（不会误判为闭眼），
  且 human 的 blink 判定与我们算的比值同源同公式（极性一致、不会打架）。
  真机验证建议由 task-3 在集成时做，只需打印 `frame.openLeft` 观察。
- **不做 embedding/recognition**：身份比对依赖后端 CompreFace，本期未接入。
- 未修改 `FaceVerifyDialog.vue`、未改 `vite.config.ts`（约束遵守）。

---

## 附录：改动文件清单

```
M  front-end/package.json                                 +"@vladmandic/human": "^3.3.6"
M  front-end/package-lock.json                            （npm install 产生）
?? front-end/public/models/{blazeface,facemesh}.{json,bin}  （新增，2.1MB）
?? front-end/src/views/exam/student/faceLiveness.ts         （新增，437 行）
?? front-end/src/views/exam/student/faceLiveness.spec.ts    （新增，475 行 / 35 用例）
```

未改：`vite.config.ts`、`vitest.config.ts`、`FaceVerifyDialog.vue`、`tsconfig*`。
