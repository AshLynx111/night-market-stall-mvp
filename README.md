# 夜市大排档

一款适配横屏浏览器的烤冷面经营小游戏，使用 React、TypeScript 和 Vite 构建。游戏包含多日关卡、顾客队列、双区铁板、食材手势、火候、订单修饰条件、角色动画、合成音效和浏览器本地存档。

## 本地开发

需要 Node.js 20.19+ 或 22.12+。

```bash
npm ci
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

生产文件输出到 `dist/`。`dist/` 不提交到 Git；推送 `main` 后由 GitHub Actions 自动构建并发布到 GitHub Pages。

## 主要目录

```text
src/components/           页面和游戏组件
src/game/audio.ts         浏览器合成音效
src/landscape/            关卡、订单和烹饪状态
src/assets/approved/      页面运行时实际使用的美术资源
.github/workflows/        GitHub Pages 自动部署
```
