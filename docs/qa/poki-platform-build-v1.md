# Poki Platform Build V1 — Final QA Report

## 1. 修改摘要

新增独立 Poki 生产目标、统一平台适配器、失败自动放行的 SDK 初始化、去重 gameplay lifecycle、自然断点商业广告、广告期间计时/音频/输入冻结、生产外联审计、浏览器 QA 与上传 ZIP。未改游戏内容、视觉、数值或存档结构。

## 2. Platform Adapter 架构

`src/platform/` 将平台分成 `standalone` 与 `poki` 两个 adapter。React/gameplay 只调用统一 controller，不直接访问 `window.PokiSDK`。`__POKI_BUILD__` 是编译期常量，保证两个生产 bundle 物理隔离。

## 3. Standalone 行为

`npm run build` 仍输出 `dist/`。adapter 为同步 no-op；首次开始、重玩、下一天和暂停返回都保持现有即时行为。静态审计确认 standalone 没有 Poki SDK URL、`PokiSDK` 或 Poki chunk。

## 4. Poki SDK 初始化行为

仅 `npm run build:poki` 在 HTML head 加载官方 v2 SDK。游戏渲染与 SDK 初始化并行；SDK 最多等待 3,000 ms，缺失、超时或 reject 均 warning 后 fail-open，不阻止游戏。

## 5. `gameLoadingFinished` 触发时机

等待 `window.load`、当前 document images 完成 decode/load settle，再等待两帧；singleton controller 在一个 document 生命周期只发送一次。生产 mock 记录为一次。

## 6. `gameplayStart` 所有触发点

Home 的 Start Game、Continue、Day Select 可玩关卡、广告完成后的 Pause Resume、Play Again、Next Day，以及 Day 5 event 返回实际烹饪时，通过同一个 derived gameplay state 产生 start edge。普通菜单页不会发送。

## 7. `gameplayStop` 所有触发点

Pause/menu、Help、Abandon confirm、Day Complete/Summary、退出当前 Day、Day 5 event/cutscene 进入时产生 stop edge。controller 拒绝连续重复 stop。

## 8. `commercialBreak` 所有触发点

仅三个已有自然断点：playing pause 的 Resume、Summary 的 Play Again、Summary 的 Next Day。首次 Start、Continue、Day card、Help close、取消放弃和最终日返回 Select 均不请求广告。

## 9. Advertisement lock 实现

break 请求同步设置 `breakActive`，现有 kitchen pause reducer 停止 patience/heat tick；continuation 只在 promise resolve/reject 后执行。2,000 ms 生产 mock 验证 patience、烹饪阶段、screen 与 save 均不变化。

## 10. Audio suspend 实现

广告使用独立内存态 `platformAudioSuspended`。BGM 强制 muted/volume 0，sizzle/tone 立即停止且禁止新建；结束后按玩家原 `master × music`、mute 与 effects 设置恢复，绝不写入用户设置。

| 状态 | Audio |
| --- | --- |
| gameplay | 用户原设置 |
| pause | 当前游戏暂停态 |
| commercial break | forced mute |
| after ad | 恢复用户原设置 |

## 11. Input suspend 实现

广告期间 fixed full-viewport lock 捕获并阻断 keyboard、pointer、touch 与 click；gameplay shortcuts 同时关闭，Kitchen session 设为 paused/inert。SDK settle 后统一解锁。

## 12. External request audit

Poki runtime 浏览器请求只有本地 preview assets 与 `https://game-cdn.poki.com/scripts/v2/poki-sdk.js`。使用 GA/analytics/feedback sentinel 环境变量重新构建后，sentinel 未进入产物；无 GA、feedback、Google Fonts、CrazyGames、AdSense、远程媒体、远程 CSS 或其他 SDK 请求。

## 13. Incognito QA

jsdom 与真实 Chromium 均模拟 local/session storage `getItem`/`setItem` 抛错。Home → Start Game → Day 1 → first ingredient 正常，无白屏或 page error；仅进度不持久化。

## 14. Desktop QA

鼠标完整走通 Load → Home → Start → Day 1 → Pause → 2 秒 Resume ad → 完成 3 单 → Summary → Next Day ad → Day 2。无 console/page error、无溢出、无 debug/feedback UI。

## 15. Mobile QA

640×360 touch 与 836×470 touch 均用 Chromium 原生 touch events 完成第一单，覆盖 tap、刷酱、切、卷、装盒与交付。390×844 显示游戏自己的横屏提示，无 browser alert。

## 16. 640×360 QA

Mouse 与 touch 均 PASS：无横/纵滚动，HUD、顾客、食材架、双铁板与交付区均可见；截图 `day1-640x360*.png`。

## 17. 836×470 QA

Mouse 与 touch 均 PASS：无溢出或裁切；touch 完成第一单；截图 `day1-836x470*.png`。

## 18. 1031×580 QA

Mouse PASS：无溢出，核心 gameplay regions 全部可见；截图 `day1-1031x580.png`。1440×810 同样 PASS，作为 desktop reference。

## 19. standalone regression

完整 test suite、standalone build 与静态审计通过。standalone 保留 debug/playtest/analytics 原逻辑，且重玩/下一天不等待 platform queue；没有 Poki runtime reference/request。

## 20. Poki event sequence log

```text
init
gameLoadingFinished
gameplayStart
gameplayStop
commercialBreak:start
commercialBreak:end
gameplayStart
gameplayStop
commercialBreak:start
commercialBreak:end
gameplayStart
```

没有相邻重复 `gameplayStart`/`gameplayStop`，也没有在 commercial promise settle 前重新 start。

## 21. Tests

覆盖 standalone no-op、Poki init success/reject/timeout、break reject、loading once、start/stop dedupe、商业广告序列、音频恢复、input lock、storage denial、现有 App/Kitchen/analytics/i18n 回归，以及生产浏览器完整流程。最终结果：74 test files / 388 tests 全通过；428 个 art assets 验证通过。最终命令：`npm test -- --run`、`npm run validate:art`、`node scripts/qa-poki-platform-build-v1.mjs`。

## 22. build

`npm run build` → `dist/` PASS。`npm run build:poki` → `dist-poki/` PASS。Poki env-isolation sentinel build与 `scripts/audit-platform-builds.mjs` PASS。

## 23. bundle delta

| 指标 | Standalone | Poki |
| --- | ---: | ---: |
| 全部 production files | 26,034,617 B | 26,031,441 B |
| JS | 406,770 B | 403,497 B |
| CSS | 90,940 B | 90,940 B |
| Poki 相对总量 | — | -3,176 B |

Poki main 移除了 2,288 B debug chunk并增加 920 B adapter chunk。Poki 首屏本地文件约 1,075,384 B；Day 1 新请求的唯一 bundled assets 约 6,336,253 B（含 2,401,300 B BGM）。未做本轮禁止的 asset/preload 重构。

## 24. Poki ZIP path

`D:\game_demo\artifacts\night-market-poki-build-v1.zip`。ZIP 根目录直接包含 `index.html` 与 `assets/`，共 308 entries，无 `dist-poki/` 外层目录。

## 25. ZIP size

25,649,778 B。SHA-256：`9D2454AA334BE5DF66A666D54FE99FA77BD9CE995860C1D75A6A65E413AEB0DF`。

## 26. Poki Inspector status

Poki Inspector: NOT RUN。当前产物已按 Inspector folder/ZIP 结构准备；本地使用 deterministic Poki SDK mock 完成 runtime QA。

## 27. P0 blockers

NONE。

## 28. P1 blockers

NONE。提交平台前仍建议在 Poki Inspector/真实平台环境做最终 smoke test；这不是当前代码 blocker。

## 29. Character assets modified: NO

角色与顾客 asset diff audit 为零。

## 30. Gameplay balance modified: NO

recipes、ingredients、patience、target orders、economy、upgrade prices、scoring 与 reducer 未修改。

## 31. Campaign/progression modified: NO

`src/landscape/campaign.ts` 与 `src/landscape/progression.ts` 相对基线无差异。

## 32. Save schema modified: NO

继续使用现有 `night-market-campaign-v1` schema；platform/audio suspension 不持久化新字段。
