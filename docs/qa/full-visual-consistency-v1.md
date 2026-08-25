# 夜市大排档完整视觉一致性 QA

## 范围与结论

本轮使用 Microsoft Edge 对生产构建执行真实完整流程：`首页 → 选关 → Day 1 → 教程 → 多顾客/双铁板 → 结算 → 升级 → Day 2 → 设置`。流程分别从空存档以 1440×810 和 844×390 跑完，并额外以 390×844 验证竖屏横屏提示。

最终结果：未发现 P0；确认并修复 3 类 P1。所有 17 张关键状态截图均无视口滚动、关键控件越界、图片解码失败、控制台错误或页面异常。未修改玩法、业务逻辑、页面结构或已经验收的主界面/结算页布局。

## 问题表

| 页面 | 问题 | 严重程度 | 是否已修复 | 修改文件 |
|---|---|---:|---|---|
| 首页 | 未发现明显视觉问题；透明热点的 hover/active 保持原画结构且尺寸不跳变 | — | 不适用 | — |
| 选关 | 底图中的平面火焰/灯笼仍会露出，与结算页已验收的 2.5D 钱袋/炉火/木招牌图标族不一致 | P1 | 是 | `src/landscape.css` |
| 选关 | 资金不足的火力/招牌按钮与可点击状态几乎无视觉区分 | P1 | 是 | `src/landscape.css` |
| 选关 | 星级仍使用定制样式的 `★/☆` 字形；语义明确、描边/颜色与纸牌一致，未构成明显系统图标感 | P2 | 否（按要求仅记录） | — |
| Day 1 教程 | 右下帮助入口直接使用“？”字符，依赖系统字形 | P1 | 是 | `src/components/LandscapeGame.tsx`、`src/components/game/GameIcon.tsx`、`src/landscape.css` |
| Day 1 教程 | 844×390 下教程提示随固定 16:9 场景缩放后字号偏小，但仍可辨认且无遮挡 | P2 | 否（按要求仅记录） | — |
| 多顾客 / 双铁板 | 两位等待顾客、左右铁板食物和清空按钮均未重叠、越界；帮助入口字符图标问题同上 | P1 | 是 | `src/components/LandscapeGame.tsx`、`src/components/game/GameIcon.tsx`、`src/landscape.css` |
| Day 1 结算 | 可购买升级卡状态正常；未发现图标拼贴、动态文字覆盖或卡片位移 | — | 不适用 | — |
| 升级后的结算状态 | 资金不足后卡片仍像可点击状态；旧底图文字/图标在初版修正中曾因遮罩透明而透出，最终改为不透明遮罩并只降低前景内容饱和度 | P1 | 是 | `src/landscape.css` |
| 升级后的结算状态 | 结算星级仍使用定制 `★` 字形；与现有金色评分语言一致 | P2 | 否（按要求仅记录） | — |
| Day 2 | 顾客、订单气泡、HUD、食材架、双铁板和帮助入口均在安全范围内；帮助入口字符图标问题同上 | P1 | 是 | `src/components/LandscapeGame.tsx`、`src/components/game/GameIcon.tsx`、`src/landscape.css` |
| 设置 | 三个滑杆、音乐按钮和返回按钮对齐，无重复滑块、贴图边缘或低对比度问题；hover/active 尺寸不跳变 | — | 不适用 | — |
| 玩法/菜单弹窗 | 关闭按钮使用“×”系统字符，与统一线性 SVG 语言不一致 | P1 | 是 | `src/components/LandscapeGame.tsx`、`src/components/game/GameIcon.tsx`、`src/landscape.css` |
| 手机横屏与竖屏提示 | 844×390 使用固定 16:9 安全画布居中，左右留边不承载交互；390×844 提示内容位于安全区内，无越界 | — | 不适用 | — |

## 截图清单

截图目录：`docs/qa/screenshots/full-visual-consistency-v1/`

- `01-home-1440x810.png` / `01-home-844x390.png`
- `02-select-1440x810.png` / `02-select-844x390.png`
- `03-day-1-tutorial-1440x810.png` / `03-day-1-tutorial-844x390.png`
- `04-day-1-dual-griddle-1440x810.png` / `04-day-1-dual-griddle-844x390.png`
- `05-summary-1440x810.png` / `05-summary-844x390.png`
- `06-summary-upgraded-1440x810.png` / `06-summary-upgraded-844x390.png`
- `07-day-2-1440x810.png` / `07-day-2-844x390.png`
- `08-settings-1440x810.png` / `08-settings-844x390.png`
- `09-rotate-prompt-390x844.png`（竖屏提示额外证据）
- `contact-sheet-1440x810.png` / `contact-sheet-844x390.png`
- `qa-results.json`

## 自动化检查

- 所有 17 张源截图尺寸与命名矩阵一致。
- 所有可见 raster asset 均成功解码。
- 所有状态 `scrollWidth/scrollHeight` 与视口一致，无水平或垂直页面滚动。
- 机器检查未发现关键按钮、输入、进度条、动态遮罩或页面主画板超出视口。
- 首页与设置页 hover/active 采样未改变控件尺寸。
- 选关和结算 disabled 状态均返回 `cursor: not-allowed`，并有明确但克制的视觉降级。
- 控制台错误：0；页面错误：0。
- 评分星号作为语义化评分文字保留，不作为控制图标使用。
- 全量测试：55 个测试文件、327 项测试全部通过。
- 生产构建：453 modules transformed。

## 验证命令

```text
npx vitest run --config vitest.config.ts src/components/game/GameIcon.test.tsx src/styles/forbiddenGameplayEmoji.test.ts
npm test
npm run build
node scripts/capture-full-visual-consistency-v1.mjs
```
