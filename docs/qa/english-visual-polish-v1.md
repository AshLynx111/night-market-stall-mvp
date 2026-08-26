# English Visual Polish V1 QA Report

Date: 2026-08-26  
Branch: `codex/english-visual-polish-v1`

## 1. 修改摘要

- 将英文首页、设置页、选关页和结算页的文字局部色块改为完整的木牌/暖纸内表面，保留原有画框、位置、尺寸与点击区域。
- 新增英文首页与设置页游戏标题内表面，并将头像卡中的烘焙昵称改为英文纸签；不替换整张背景图。
- 选关卡片建立 `DAY / title / story / goal` 层级，过长文案优先缩短，不使用小于 10px 的字体。
- 教程提示和订单气泡统一为轻量暖纸材质；HUD、游戏几何与交互保持不变。
- 结算页标题、提示、数据卡、按钮与升级文案统一到同一木牌/纸张体系；已验收的钱袋、炉火、招牌图标未重绘。
- 英文主要字体限定为 Display 与 UI 两个角色，无远程字体依赖。

## 2. 修改文件

| 文件 | 用途 |
| --- | --- |
| `src/components/LandscapeGame.tsx` | 英文专属标题、头像标签和既有 locale 表面的结构 |
| `src/landscape.css` | 英文木纹、纸纹、字体层级及各页面局部表面 |
| `src/styles/kitchen.css` | 英文教程便签和订单纸条材质 |
| `src/i18n/en.ts` | 视觉长度校对、英文标题与头像标签 |
| `src/i18n/zh-CN.ts` | 仅补充字典键以保持 locale 类型一致；中文不渲染新增英文表面 |
| `src/i18n/appLocale.test.tsx` | 英文标题、头像标签及 aria 回归 |
| `src/styles/englishVisualPolish.test.ts` | 英文字体、材质、页面表面与冻结资产契约 |
| `scripts/capture-english-visual-polish-v1.mjs` | 22 个页面/视口的自动截图与诊断 |
| `docs/qa/screenshots/english-visual-polish-v1/` | 单页截图、4 张 contact sheet、自动结果与人工风险记录 |

## 3. Locale-neutral Text Art 审计

| 页面/区域 | 中文烘焙文字 | 改造前英文处理 | 推荐方案 | 最终处理 |
| --- | --- | --- | --- | --- |
| 首页主标题 | 中央木牌中的中文游戏名 | 中文仍可见 | 完整重建木牌内表面 | 英文专属木纹内表面，保留金属框、绳索和主视觉位置 |
| 首页头像卡 | 头像右侧烘焙昵称 | 中文仍可见 | 局部纹理匹配纸签 | 新增 `Stall Owner` 暖纸签；金币、等级和头像不动 |
| 首页主/次按钮 | 五块木牌内中文标签 | 英文局部纯色遮罩 | Real DOM full-face panel | 五个按钮使用完整木纹内表面，并统一 hover/active/focus |
| 首页环境招牌 | 摊位布旗、灯笼、黑板、店铺招牌 | 保留中文 | 作为夜市场景环境美术保留 | 未修改；不属于功能 UI |
| 设置页顶部游戏牌匾 | 背景中的中文游戏名 | 中文仍可见 | 复用首页木牌内表面 | 英文专属 `Night Market / Street Food Stall` 木牌内表面 |
| 设置页头像卡 | 头像右侧烘焙昵称 | 中文仍可见 | 复用首页纸签 | 英文 `Stall Owner` 暖纸签 |
| 设置页标题/三行标签/返回 | 纸板和按钮中的中文 | 纯色文字局部遮罩 | 暖纸标题、小纸签、完整按钮面 | 已按原滑杆几何完成；不移动滑杆或点击区域 |
| 选关页标题 | 顶部木牌中文标题与副标题 | 大块英文木色遮罩 | 木牌完整内表面 | 木纹、暖高光、两级英文排版 |
| 六张 Day 卡 | 卡内标题、剧情、目标、锁定文案 | 大块浅色矩形 | 卡片完整纸张内表面 | 保留卡框和星级；统一信息层级与纸纹 |
| 选关返回/菜单/升级区 | 控件与升级牌中的中文 | 局部色块或深色遮罩 | 完整按钮面/木质文字槽 | 已完成；升级图标、价格、布局和逻辑不变 |
| Gameplay 背景 | 夜市摊位环境招牌 | 不覆盖 | 保留环境美术 | 未修改 |
| Tutorial / Order Bubble | 无烘焙功能文字 | 偏白 DOM 面板 | Paper UI System | 暖奶油纸、细棕边、短软阴影；位置与逻辑不变 |
| HUD / 食材标签 | 无烘焙功能文字 | DOM UI | 只做必要检查 | 无挤压、无越界；未重设计 |
| 结算页标题与功能区域 | 标题、统计、按钮、升级文案烘焙在结果板 | 多个纯色纸/橙色遮罩 | 木牌/暖纸完整内表面 | 标题、提示、统计、操作按钮和升级文字槽统一完成 |
| 菜单 | 菜单图中的中文标题/菜谱文字 | 已有英文 DOM 纸面 | 保留结构并统一纸面 | 使用共享纸张体系；不重建菜单图或菜品图 |
| Day 5 事件 | 场景美术；功能文案为 DOM | 对话纸面 | 仅统一对话材质 | 对话框接入 Paper UI；人物和事件美术未修改 |

## 4. Pasted-overlay Risk

| 页面 | 风险 | 人工视觉证据 |
| --- | --- | --- |
| Home | LOW | 标题和五个按钮均覆盖完整内表面，中文功能文字无边缘残留；暖光、描边和木纹一致。环境招牌作为场景保留。 |
| Settings | LOW | 顶部游戏牌匾、设置标题、三行标签、返回按钮和头像标签均已材质化；无明显纯色盖章边界。 |
| Day Select | LOW | 标题、六张卡片、状态条、星级区、返回/菜单和升级文字槽均贴合原框体；无白色 SaaS 卡片感。 |
| Summary | LOW | 标题、班次标题、提示、统计卡、升级槽和按钮形成统一木/纸系统；未发现中文残影。 |

结构化人工记录见 `docs/qa/screenshots/english-visual-polish-v1/pasted-overlay-review.json`。

## 5. QA 结果

### English Desktop — 1440×810

Home、Settings、Day Select、Day 1、Tutorial、Multiple Customers、Summary 共 7 张截图全部通过。

### English Mobile Landscape — 844×390

同 7 个关键页面全部通过；无横向/纵向 overflow、无控件裁切、无安全区冲突、无小于 10px 的 locale 文案。

### Chinese Regression

Home、Day Select、Gameplay、Summary 在 1440×810 与 844×390 共 8 张截图全部通过。新增视觉规则均限定在 `html[data-locale="en"]` 或英文条件 DOM；中文页面布局、人物、主视觉与交互保持基线。

### 自动诊断

| 指标 | 结果 |
| --- | ---: |
| 页面/视口记录 | 22 |
| Console errors | 0 |
| Page errors | 0 |
| Horizontal overflow | 0 |
| Vertical overflow | 0 |
| Clipped controls | 0 |
| 英文功能 DOM/aria 中的 CJK | 0 |
| 小于 10px 的 locale 文案 | 0 |
| 纯白/未材质化的目标表面 | 0 |

## 6. Build 与 Tests

- `npm run build`: PASS — TypeScript 与 Vite production build 成功，458 modules transformed。
- `npm test -- --run`: PASS — 60 test files、352 tests 全部通过。
- `node scripts/capture-english-visual-polish-v1.mjs`: PASS — 14 张英文截图、8 张中文回归截图、4 张 contact sheet 和结构化 QA 结果已生成。

## 7. 新增 locale-specific assets

未新增任何英文专属 PNG/WebP 或远程字体。`src/assets/runtime/locale/en/` 新增文件数为 0，新增资源总大小为 **0 bytes**。本轮使用英文条件 DOM 与 CSS 纹理表面完成。

## 8. 冻结边界确认

Character assets modified: NO

Gameplay logic modified: NO

Campaign/progression modified: NO

