# 夜市大排档全流程视觉系统统一设计

## 目标

以当前首页为唯一视觉母版，将营业日选择、游戏 HUD、游戏外围 viewport、结算、设置、手机横屏提示和通用交互状态统一到同一套暖色夜市木牌系统。不得重新设计结构、修改玩法、重绘页面或触碰人物。

## 冻结基线

- 起始提交：`36214b8`
- 人物相关代码、人物位置、人物尺寸与全部人物 PNG/WebP 资产完全冻结。
- 烹饪几何、触控热区、订单/关卡/升级/存档逻辑完全冻结。
- 已验收的结算升级图标（钱袋、小炉火、小木招牌）完全冻结，仅允许由页面容器统一材质，不改 SVG 形状。

## 方案选择

### 方案 A：逐页独立覆盖

优点是改动快；缺点是颜色、边框和阴影继续分散，下一轮仍会漂移。不采用。

### 方案 B：重新生成页面背景

统一度可能最高，但违反禁止整页重绘与人物冻结要求，也会破坏已验收坐标。不采用。

### 方案 C：Token + 局部材质覆层（采用）

从首页抽取夜色、木色、金边、纸张、投影、高光和交互状态 token，在现有 DOM 与 approved assets 上增加局部 CSS 材质层。它不会改变结构和 hitbox，可单独回滚各页面，并能形成稳定的跨页面视觉合同。

## 统一视觉语言

### 色彩与材质

- 夜色：蓝黑中加入轻微暖棕，不使用纯网页深蓝。
- 深木：用于 panel 外框和 HUD 控件主体。
- 中木：用于 hover、active 和局部层次。
- 金边：统一边框与内高光方向，光源固定为左上。
- 奶油纸：改为偏旧、偏暖的羊皮纸，不使用纯白。
- 阴影：统一下落方向与强度，保留轻微 2.5D 厚度。

### Design tokens

扩展 `src/landscape.css` 根 token，至少覆盖：

- `--night-bg`
- `--night-warm-edge`
- `--wood-dark`
- `--wood-mid`
- `--wood-light`
- `--gold-border`
- `--paper-cream`
- `--paper-aged`
- `--warm-highlight`
- `--ink-dark`
- `--shadow-warm`
- `--panel-radius`
- `--panel-border`
- `--panel-shadow`

保留现有变量别名，避免无关 CSS 大规模迁移。

## 页面设计

### Gameplay viewport

保持 1440×810 logical canvas 与 `fitGameplayScene()` 逻辑不变。在 `.game-screen` 背后使用现有 gameplay 夜市场景作为模糊、降亮、暖色的环境延展，letterbox 区域不再是纯深蓝网页底色。safe-area 容器和触控坐标不变。

### Gameplay HUD

保留 Day、Orders、Coins、Pause、Sound 的 DOM、尺寸和位置。统一改为深木渐变外壳、金棕边框、左上暖高光、下方厚度阴影；Orders 保留奶油纸芯与视觉中心地位；GameIcon 继续使用现有 SVG 架构。

### 营业日选择

保留六张 Day 卡和全部坐标。使用覆盖层降低纸张纯白感，增加暖旧纸色与轻微木框内阴影；locked Day 通过亮度/饱和度减弱和现有 SVG 小锁表达，不做大片网页灰层。底部升级图标保持当前 2.5D SVG。

### 结算

保留中央板、四列数据、升级区和双按钮结构。在主板内部增加局部暖旧纸 tint、木框内阴影和金边高光；四张数据卡增加轻微旧纸与木框层次。当前三枚升级图标不修改。

### 设置

保留现有 approved 背景与三条 range。slider 使用同一金棕轨道、暖色体积 thumb、统一 focus/hover 光晕；返回和音乐热点沿用首页交互语言，不增加新组件。

### 手机横屏提示

保留当前旋转 SVG 和文案。在竖屏安全区内增加深木牌 + 奶油纸芯提示面板，背景使用 gameplay 场景的暖色暗化延展，使其像游戏内“准备营业”提示而不是错误页。844×390 横屏仍完整保留操作区。

### 通用交互

统一 button/panel 的边框、圆角、投影、hover、active、disabled 和 focus-visible token。只合并能直接复用的 CSS selector，不新增强制性 React 抽象组件。

## QA

生产构建中真实完成完整流程两次：1440×810 与 844×390；另以 390×844 验证横屏提示。生成 before/after 与统一 contact sheet，并逐项回答验收问题 A–E。

机器检查继续验证：图片解码、console/page errors、viewport overflow、关键控件 clipping、hover/active/disabled 尺寸稳定和截图尺寸。

人物冻结通过以下命令确认：

```text
git diff --name-only 36214b8..HEAD
```

输出必须包含：`Character assets modified: NO`、`gameplay logic modified: NO`、`campaign/progression modified: NO`。

## 非目标

不修改人物、人物资产、角色布局、玩法、关卡、经济、升级效果、存档、食材、动画系统、状态管理、SDK、i18n 或 SEO；不生成任何新 raster 页面资产。

