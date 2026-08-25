# 全流程视觉系统统一 QA

- 分支：`codex/visual-system-unification-v1`
- 冻结基线：`36214b8`
- 唯一视觉母版：首页（深夜蓝黑、暖橙灯、深棕木、金边、旧奶油纸、2.5D 轻拟物）
- QA 流程：首页 → 选关 → Day 1 教程 → 多顾客 / 双铁板 → 结算 → 升级 → Day 2 → 设置 → 手机竖屏提示

## 1. 修改摘要

- 建立跨页面夜市材质 token，保留旧变量别名，避免业务层重构。
- 使用已验收的 gameplay 场景做暗化、暖色、模糊环境延展，替代 844×390 下明显的纯深蓝 letterbox。
- HUD 信息结构和坐标保持不变，仅统一为深木、金边、旧纸与暖色高光。
- Day 卡片保持 6 卡进度结构，增加克制的暖纸、木框与锁定材质层。
- 结算页保持所有结构、文案、逻辑和已验收升级图标不变，仅降低大纸板的纯白感，并增加统计卡内嵌感。
- 设置页保持功能不变，slider 使用同一木 / 金 / 暖光 token。
- 通用按钮、modal、关闭按钮统一材质；竖屏提示改为木框 + 旧纸内芯的“准备营业”牌。

## 2. 修改文件

| 文件 | 用途 |
|---|---|
| `src/landscape.css` | design tokens、viewport 环境延展、HUD、选关、结算、设置、modal、rotate 提示 |
| `src/components/LandscapeGame.tsx` | 仅向 gameplay 根节点传入现有场景 URL，供 CSS 环境延展使用 |
| `src/styles/visualSystemUnification.test.ts` | 跨页面材质与冻结结构视觉合同 |
| `scripts/capture-full-visual-consistency-v1.mjs` | 支持独立输出目录，并记录具体图片解码失败资源 |
| `scripts/create-visual-system-unification-comparison.mjs` | 生成桌面、手机横屏、竖屏提示 before / after 对比图 |
| `docs/qa/screenshots/visual-system-unification-v1/` | 17 张关键页面截图、contact sheet、对比图与机器 QA 结果 |

## 3. 页面级 before / after

| 页面 | Before | After | 结果 |
|---|---|---|---|
| 首页 | `full-visual-consistency-v1/01-home-*` | `visual-system-unification-v1/01-home-*` | 视觉母版，不改 |
| 选关 | `full-visual-consistency-v1/02-select-*` | `visual-system-unification-v1/02-select-*` | 结构不变，纸卡与锁定态材质统一 |
| Day 1 教程 | `full-visual-consistency-v1/03-day-1-tutorial-*` | `visual-system-unification-v1/03-day-1-tutorial-*` | HUD 木牌化；手机横屏纯蓝边条消失 |
| 多顾客 / 双铁板 | `full-visual-consistency-v1/04-day-1-dual-griddle-*` | `visual-system-unification-v1/04-day-1-dual-griddle-*` | 人物、铁板、触控几何不变 |
| 结算 | `full-visual-consistency-v1/05-summary-*` | `visual-system-unification-v1/05-summary-*` | 旧纸压暗、统计卡内嵌；升级图标不变 |
| 升级状态 | `full-visual-consistency-v1/06-summary-upgraded-*` | `visual-system-unification-v1/06-summary-upgraded-*` | disabled / upgraded 状态保持可辨 |
| Day 2 | `full-visual-consistency-v1/07-day-2-*` | `visual-system-unification-v1/07-day-2-*` | 进度和玩法不变，环境连续 |
| 设置 | `full-visual-consistency-v1/08-settings-*` | `visual-system-unification-v1/08-settings-*` | slider 材质统一，可用性不变 |
| 竖屏提示 | `full-visual-consistency-v1/09-rotate-prompt-*` | `visual-system-unification-v1/09-rotate-prompt-*` | 从错误提示感改为游戏内木牌 / 旧纸提示 |

## 4. 问题表

| 页面 | 问题 | 严重程度 | 是否已修复 | 修改文件 |
|---|---|---:|---|---|
| Gameplay viewport | 844×390 固定比例外侧像纯深蓝网页容器 | P0 | 是 | `src/landscape.css`, `src/components/LandscapeGame.tsx` |
| Gameplay HUD | 浅色扁平，和首页木牌体系割裂 | P0 | 是 | `src/landscape.css` |
| 选关 | 奶油卡片网格偏网页 dashboard | P1 | 是 | `src/landscape.css` |
| 选关锁定态 | 灰化生硬、材质感弱 | P1 | 是 | `src/landscape.css` |
| 结算 | 中央纸板太亮，四列数据偏网页卡片 | P1 | 是 | `src/landscape.css` |
| 设置 | slider 局部仍像浏览器 input | P1 | 是 | `src/landscape.css` |
| 通用 panel / button | modal、关闭按钮、主次按钮材质变量不统一 | P1 | 是 | `src/landscape.css` |
| 竖屏提示 | 纯深色错误提示页感，缺少游戏材质 | P1 | 是 | `src/landscape.css` |
| 选关 / 结算 | 星级仍使用现有 `★/☆` 文本；画面稳定且不是系统控制 icon | P2 | 否，仅记录 | 无 |
| 跨页面 | 少数已有 raster 木框存在 1–3 px 手绘不规则差异 | P2 | 否，仅记录 | 无 |

P0 / P1 未解决项：无。

## 5. A–E 验收

### A

否。进入 gameplay 后已无明显“网页容器 / 蓝色上下条”感。固定 16:9 画布之外使用同一 gameplay 场景的暗化暖色模糊延展，844×390 contact sheet 中可见连续的夜市环境；逻辑画布和触控几何未改。

### B

是。首页、选关、HUD、结算、设置共用 night / wood / gold / paper / highlight / shadow tokens；保留页面各自结构，但木色、金边、奶油旧纸、暖阴影和左上高光方向一致。

### C

否。没有仍与 2.5D UI 明显冲突的纯扁平 SVG 控制 icon。已验收的 `GameIcon` 继续嵌入木质控制组件；钱袋、小炉火、小招牌升级图标完全未重绘。

### D

否。结算页仍以纸张作为信息面，但亮度与纸色已收敛，背景夜市存在感保留；选关和设置也不再呈现独立网页组件感。

### E

是。人物资产、人物组件、人物几何、人物样式均未修改。

## 6. QA 与测试结果

- 生产构建真实流程：17 / 17 张截图成功。
- 1440×810：8 个关键页面；844×390：8 个关键页面；390×844：1 张竖屏提示。
- 裁切 / 越界：0。
- body 横向 / 纵向溢出：0。
- 可见图片解码失败：0。
- 控制台错误：0；页面错误：0。
- Vitest：56 个文件、333 项测试全部通过。
- Art validation：428 个素材、5 个 family 全部通过。
- Build：通过；Vite 处理 453 modules。

## 7. 冻结确认

从冻结基线 `36214b8` 审计以下目录 / 文件，diff 均为空：人物 assets、events、kitchen 业务目录、campaign、progression、game 状态与经济逻辑。

`Character assets modified: NO`

`gameplay logic modified: NO`

`campaign/progression modified: NO`
