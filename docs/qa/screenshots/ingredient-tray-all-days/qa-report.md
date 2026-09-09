# Ingredient tray 全关卡一致性验收

日期：2026-09-09。视觉基线：`6baad8c`。本轮将已接受的摆放系统统一为共享入口，没有重新设计食材、铁盒或标签。

**结论：Day 1–6 全部覆盖；仓库中可达的 gameplay tray variant 无遗漏。**

## 修改摘要与迁移清单

- 新增 `resolveIngredientRack()`：铁盒图片、variant、食材 ID → 固定槽位地址由同一 registry 解析。关卡解锁仍完全由原 campaign 数据决定。
- `KitchenScene` 与 `KitchenDaySession` 的背景层都使用该入口，消除两处独立的按数量选铁盒逻辑。
- 将 `unlockedIngredients.indexOf(id)` 的位置依赖迁移为固定 `rackIndex`，避免稀疏菜单或重排后食材套用另一槽位的标定。
- `RackGeometry.cells` 改为必填，移除旧 `Array.from` 规则网格兜底，以及 aggregate left/top/width/height/gap、通用 inner mask 和对应的根级 CSS 默认值。保留每一格原有的实际点击矩形。
- 原有 per-slot usable rect、visual center、anchor point、food scale/offset、z-order、label anchor/width/font、alpha bounds、接触阴影及盒内压暗全部保留，数值与 CSS 未变。
- 原仅覆盖 Day 1/6 的 QA 入口迁移为完整矩阵入口。旧截图及诊断文件保留为不可覆盖的比较基线。

## 全量 tray 审计

审计入口：`LandscapeGame.tsx` 中只有一个 production `KitchenScene` 调用，`KitchenScene` 中只有一处 `TableIngredient` 映射。没有按 Day 分叉的第二套左侧备料组件。

槽位来源 A：`INGREDIENT_VISUAL_SLOTS['approved-2x3']` + `KITCHEN_RACK_LAYOUTS['approved-2x3'].cells`。

槽位来源 B：`INGREDIENT_VISUAL_SLOTS['expanded-3x5']` + `KITCHEN_RACK_LAYOUTS['expanded-3x5'].cells`。

视觉参数位于 [src/landscape/kitchen/ingredientTrayLayout.ts](../../../../src/landscape/kitchen/ingredientTrayLayout.ts)，点击几何位于 [src/landscape/kitchen/sceneGeometry.ts](../../../../src/landscape/kitchen/sceneGeometry.ts)，统一选择位于 [src/landscape/kitchen/ingredientRack.ts](../../../../src/landscape/kitchen/ingredientRack.ts)。

| Day | Tray variant | 食材数量 / 铁盒容量 | Slot geometry source | 审计前已接入最新 seating | 本轮统一入口 |
|---|---|---:|---|---|---|
| Day 1 | approved-2x3 · 初始 | 5 / 6 | A | YES | YES |
| Day 2 | expanded-3x5 · 扩展备料 | 8 / 15 | B | YES | YES |
| Day 3 | expanded-3x5 · 扩展备料 | 11 / 15 | B | YES | YES |
| Day 4 | expanded-3x5 · 扩展备料 | 13 / 15 | B | YES | YES |
| Day 5 | expanded-3x5 · 全食材 / late-game | 15 / 15 | B | YES | YES |
| Day 6 | expanded-3x5 · 全食材 / late-game | 15 / 15 | B | YES | YES |

审计前六关已能到达最新 seating；此前缺口是重复的 variant 选择、仍可退回的旧网格结构，以及仅有 Day 1/6 的 QA 证据。本轮修复这些系统性缺口，没有把原本正确的关卡重新摆一遍。

实际只有 **2 种物理铁盒、5 种占用数量（5/8/11/13/15）**。Day 1 的第六格留空是原有解锁配置。6 格全部占用、0–15 个连续配置，以及稀疏/重排菜单另有单元检查；不把这些非 campaign 状态冒充真实关卡截图。

| 其它场景 / 名称 | Day / 数量 | 实际 tray 处理 | QA |
|---|---|---|---|
| 双铁板同时放入食物 | Day 1–6 / 各关原数量 | 同一个 A/B tray，不随铁板状态切换配置 | 六关分别实拍 1440×810，全景 + 局部 |
| Guided tutorial | Day 1 / 5 | A；禁用/高亮状态保留同一摆放参数 | 四尺寸，全景 + 局部 |
| Day 5 特殊事件返回 | Day 5 / 15 | B；真实完成 4 单触发事件后返回 | 四尺寸，全景 + 局部 |
| Full menu / late-game 全食材备料 | Day 5–6 / 15 | B，无第三种物理铁盒 | 两关四尺寸 + DPR 3 局部 |
| UI 中的 Full Menu 弹窗 | Home / Day select / Summary | `MenuModal` 为菜谱展示，不包含可操作的左侧 tray | 源码审计，不修改该 UI |
| Day 5 event 插画中的铁盒 | Event overlay | 铁盒已烘焙在整张剧情插画中，不是 gameplay tray 组件 | 保留原图；附 event-entry 实拍说明边界 |

## 全食材映射

以下 15 种是当前全部 IngredientId；每种均有 alpha-aware bounds，并在其所有已解锁关卡的四尺寸截图中检查。槽号从 0 开始，指向对应铁盒的已接受视觉参数。

| English label | ID | 槽号 | 出现关卡 |
|---|---|---:|---|
| Noodle Sheet | noodle | 0 | Day 1–6 |
| Egg | egg | 1 | Day 1–6 |
| Hot Dog | hot-dog | 2 | Day 1–6 |
| Sauce | sauce | 3 | Day 1–6 |
| Scallions | scallion | 4 | Day 1–6 |
| Cilantro | cilantro | 5 | Day 2–6 |
| Onion | onion | 6 | Day 2–6 |
| Chili Powder | chili-powder | 7 | Day 2–6 |
| Spicy Fire Noodles | turkey-noodle | 8 | Day 3–6 |
| Cheese | cheese | 9 | Day 3–6 |
| Corn | corn | 10 | Day 3–6 |
| Cajun Chicken | orleans | 11 | Day 4–6 |
| Bacon | bacon | 12 | Day 4–6 |
| Tenderloin | tenderloin | 13 | Day 5–6 |
| Enoki | enoki | 14 | Day 5–6 |

标签延续当前前沿锚点、`0 3px` padding、原字号/宽度和配色。不同透视排的字号及长名称例外沿用原 profile；同一槽位跨关卡不再独立设定。640×360 下文字仍随原场景缩小，本轮保证没有裁字、互挡或字号回退，不宣称重新提升了小屏排版。

## QA 结果与复现

- `npm run build:poki`：通过，TypeScript + production bundle。
- 相关 5 个测试文件：**98 / 98 通过**，包含现有交互/几何回归和新增六关、容量、重排、稀疏菜单检查。
- `node scripts/qa-ingredient-tray.mjs`：**44 组记录通过**，页面与 console error **0**。
- 普通 gameplay：6 天 × 4 尺寸 = **24 个组合**；每组全景 + 原尺寸 tray 裁图。额外六张 DPR 3 tray 近景。
- 双铁板 6 组、新手引导 4 组、事件返回 4 组。连同事件进入图，共 **83 张实际浏览器截图**；另有 **6 张四尺寸局部汇总图**。
- 自动检查 English 强制生效、无页面溢出、正确食材/铁盒/背景一致性、铁盒盖过旧前景、alpha 食材完整位于槽位 mask 内、标签位于食材下方、不截字、点击归属正确、接触阴影与盒内压暗存在、hover 不抬起食材。
- 同尺寸 Day 1/6 与已接受基线的 image / label / control 几何偏移最大 **0 px**。跨尺寸/场景换算到 1440×810 后的最大偏移 **0.000055 px**，属于浏览器浮点误差。详细诊断见 [qa-results.json](qa-results.json)。
- 人工逐图检查了 24 张普通全景、6 张 DPR 3 局部、6 张双铁板、4 张引导、4 张事件返回及事件进入图。所有当前食材保持原有盒内摆放，没有发现局部变体回退、跨槽、被标签盖住或旧前景遮住铁盒。

测试环境：本地 `dist-poki` production bundle + Edge/Playwright，1440×810、844×390、836×470、640×360，English；仅 Poki SDK 网络响应使用 mock。这是 production 构建 QA，不是已发布到 Poki 网站的线上验收。通过已有存档 schema 设置目标关卡后，使用真实按钮进入 gameplay；Day 5 事件通过真实烹饪/交付操作触发，未注入游戏 reducer 状态。

复现相关测试：

```powershell
npm test -- src/landscape/kitchen/ingredientRack.test.ts src/landscape/kitchen/sceneGeometry.test.ts src/components/game/KitchenScene.test.tsx src/styles/kitchen-layout.test.ts src/styles/referenceGameplayComposition.test.ts
npm run build:poki
node scripts/qa-ingredient-tray.mjs
```

## 截图索引

本文件所在目录即完整 QA 截图路径：`docs/qa/screenshots/ingredient-tray-all-days/`。下列每格均提供真实全景和相同尺寸下的 tray 裁图。

| Day | 1440×810 | 844×390 | 836×470 | 640×360 | 清晰局部 / 四尺寸对照 |
|---|---|---|---|---|---|
| Day 1 | [全景](day-1-gameplay-1440x810.png) · [tray](day-1-gameplay-1440x810-tray.png) | [全景](day-1-gameplay-844x390.png) · [tray](day-1-gameplay-844x390-tray.png) | [全景](day-1-gameplay-836x470.png) · [tray](day-1-gameplay-836x470-tray.png) | [全景](day-1-gameplay-640x360.png) · [tray](day-1-gameplay-640x360-tray.png) | [DPR 3](day-1-tray-closeup.png) · [对照](day-1-tray-size-review.png) |
| Day 2 | [全景](day-2-gameplay-1440x810.png) · [tray](day-2-gameplay-1440x810-tray.png) | [全景](day-2-gameplay-844x390.png) · [tray](day-2-gameplay-844x390-tray.png) | [全景](day-2-gameplay-836x470.png) · [tray](day-2-gameplay-836x470-tray.png) | [全景](day-2-gameplay-640x360.png) · [tray](day-2-gameplay-640x360-tray.png) | [DPR 3](day-2-tray-closeup.png) · [对照](day-2-tray-size-review.png) |
| Day 3 | [全景](day-3-gameplay-1440x810.png) · [tray](day-3-gameplay-1440x810-tray.png) | [全景](day-3-gameplay-844x390.png) · [tray](day-3-gameplay-844x390-tray.png) | [全景](day-3-gameplay-836x470.png) · [tray](day-3-gameplay-836x470-tray.png) | [全景](day-3-gameplay-640x360.png) · [tray](day-3-gameplay-640x360-tray.png) | [DPR 3](day-3-tray-closeup.png) · [对照](day-3-tray-size-review.png) |
| Day 4 | [全景](day-4-gameplay-1440x810.png) · [tray](day-4-gameplay-1440x810-tray.png) | [全景](day-4-gameplay-844x390.png) · [tray](day-4-gameplay-844x390-tray.png) | [全景](day-4-gameplay-836x470.png) · [tray](day-4-gameplay-836x470-tray.png) | [全景](day-4-gameplay-640x360.png) · [tray](day-4-gameplay-640x360-tray.png) | [DPR 3](day-4-tray-closeup.png) · [对照](day-4-tray-size-review.png) |
| Day 5 | [全景](day-5-gameplay-1440x810.png) · [tray](day-5-gameplay-1440x810-tray.png) | [全景](day-5-gameplay-844x390.png) · [tray](day-5-gameplay-844x390-tray.png) | [全景](day-5-gameplay-836x470.png) · [tray](day-5-gameplay-836x470-tray.png) | [全景](day-5-gameplay-640x360.png) · [tray](day-5-gameplay-640x360-tray.png) | [DPR 3](day-5-tray-closeup.png) · [对照](day-5-tray-size-review.png) |
| Day 6 | [全景](day-6-gameplay-1440x810.png) · [tray](day-6-gameplay-1440x810-tray.png) | [全景](day-6-gameplay-844x390.png) · [tray](day-6-gameplay-844x390-tray.png) | [全景](day-6-gameplay-836x470.png) · [tray](day-6-gameplay-836x470-tray.png) | [全景](day-6-gameplay-640x360.png) · [tray](day-6-gameplay-640x360-tray.png) | [DPR 3](day-6-tray-closeup.png) · [对照](day-6-tray-size-review.png) |

| 双铁板 gameplay（1440×810） | 全景 | Tray |
|---|---|---|
| Day 1 | [全景](day-1-dual-griddles-1440x810.png) | [tray](day-1-dual-griddles-1440x810-tray.png) |
| Day 2 | [全景](day-2-dual-griddles-1440x810.png) | [tray](day-2-dual-griddles-1440x810-tray.png) |
| Day 3 | [全景](day-3-dual-griddles-1440x810.png) | [tray](day-3-dual-griddles-1440x810-tray.png) |
| Day 4 | [全景](day-4-dual-griddles-1440x810.png) | [tray](day-4-dual-griddles-1440x810-tray.png) |
| Day 5 | [全景](day-5-dual-griddles-1440x810.png) | [tray](day-5-dual-griddles-1440x810-tray.png) |
| Day 6 | [全景](day-6-dual-griddles-1440x810.png) | [tray](day-6-dual-griddles-1440x810-tray.png) |

| 特殊场景 | 1440×810 | 844×390 | 836×470 | 640×360 |
|---|---|---|---|---|
| Day 1 引导 | [全景](day-1-guided-tutorial-1440x810.png) · [tray](day-1-guided-tutorial-1440x810-tray.png) | [全景](day-1-guided-tutorial-844x390.png) · [tray](day-1-guided-tutorial-844x390-tray.png) | [全景](day-1-guided-tutorial-836x470.png) · [tray](day-1-guided-tutorial-836x470-tray.png) | [全景](day-1-guided-tutorial-640x360.png) · [tray](day-1-guided-tutorial-640x360-tray.png) |
| Day 5 事件返回 | [全景](day-5-celebrity-return-1440x810.png) · [tray](day-5-celebrity-return-1440x810-tray.png) | [全景](day-5-celebrity-return-844x390.png) · [tray](day-5-celebrity-return-844x390-tray.png) | [全景](day-5-celebrity-return-836x470.png) · [tray](day-5-celebrity-return-836x470-tray.png) | [全景](day-5-celebrity-return-640x360.png) · [tray](day-5-celebrity-return-640x360-tray.png) |

[Day 5 event 进入图](day-5-event-entry.png) 记录独立插画场景，未作为另一种可操作 gameplay tray。

## 修改文件

| 文件 | 内容 |
|---|---|
| [src/landscape/kitchen/ingredientRack.ts](../../../../src/landscape/kitchen/ingredientRack.ts) | 新增共享 registry 和固定槽位解析 |
| [src/components/LandscapeGame.tsx](../../../../src/components/LandscapeGame.tsx) | 仅迁移 tray 背景 variant / 图片来源 |
| [src/components/game/KitchenScene.tsx](../../../../src/components/game/KitchenScene.tsx) | 迁移 plate 与食材 slot 映射；事件处理器保持原样 |
| [src/landscape/kitchen/sceneGeometry.ts](../../../../src/landscape/kitchen/sceneGeometry.ts) | 移除旧 nominal-grid fallback 和根级通用默认值；实测矩形与 griddle 部分保持原样 |
| [src/landscape/kitchen/ingredientRack.test.ts](../../../../src/landscape/kitchen/ingredientRack.test.ts) | 新增六关/容量/稀疏/重排配置检查 |
| [src/landscape/kitchen/sceneGeometry.test.ts](../../../../src/landscape/kitchen/sceneGeometry.test.ts) | 移除已废弃的 aggregate 元数据断言 |
| [src/components/game/KitchenScene.test.tsx](../../../../src/components/game/KitchenScene.test.tsx) | 移除旧根级 rack-left 断言 |
| [src/styles/kitchen-layout.test.ts](../../../../src/styles/kitchen-layout.test.ts) | 移除旧规则网格算式断言 |
| [src/styles/referenceGameplayComposition.test.ts](../../../../src/styles/referenceGameplayComposition.test.ts) | 更新共享图片来源断言 |
| [scripts/qa-ingredient-tray.mjs](../../../../scripts/qa-ingredient-tray.mjs) | 原 QA 命令转入完整矩阵 |
| [scripts/qa-ingredient-tray-all-days.mjs](../../../../scripts/qa-ingredient-tray-all-days.mjs) | 新增逐关截图、几何/标签验证、特殊状态 QA |
| 本目录 `*.png`、`qa-results.json`、`qa-report.md` | 全覆盖截图、可复核诊断与本报告 |

## 冻结范围确认

已核对运行时代码 diff：只有 tray registry、两个 tray 消费入口和旧 tray 几何元数据清理。无素材、CSS、文案或翻译修改；无 cooking/recipes/economy/progression、SDK/ads、summary/settings/day select 或 save 数据结构修改。

```text
Character assets modified: NO
Gameplay logic modified: NO
HUD layout modified: NO
Griddle logic modified: NO
Campaign/progression modified: NO
Save schema modified: NO
```

所有 Day 1–6 已覆盖：YES。未覆盖的可达特殊 gameplay tray variant：NONE。
