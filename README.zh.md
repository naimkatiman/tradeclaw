<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="88" height="88" />

<a href="https://tradeclaw.win/dashboard">
  <img src="apps/web/public/tradeclaw-demo.gif" alt="TradeClaw 仪表盘演示" width="100%" />
</a>

<h1>TradeClaw</h1>
<p><strong>开源 AI 交易信号平台。自托管。永久免费。</strong></p>
<p>RSI · MACD · EMA · 布林带 · 随机指标 — 全部集成在一个仪表盘中。2 分钟内完成部署。</p>

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?color=10b981)](https://github.com/naimkatiman/tradeclaw/commits/main)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?logo=docker)](https://hub.docker.com/r/tradeclaw/tradeclaw)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?logo=vercel)](https://tradeclaw.win/dashboard)
[![GitHub Action](https://img.shields.io/badge/Action-Marketplace-2088FF?logo=github-actions)](https://github.com/marketplace/actions/tradeclaw-signal)

**[🚀 在线演示](https://tradeclaw.win/dashboard)** · **[📡 API 文档](https://tradeclaw.win/api-docs)** · **[🤝 参与贡献](https://tradeclaw.win/contribute)**

🌍 [English](README.md) | **中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

## 为什么选择 TradeClaw？

- **无需订阅** — 自托管，掌控自己的数据，零花费
- **真实信号** — RSI/MACD/EMA/布林带/随机指标共振评分，实时获取 Binance 和 Yahoo Finance 数据
- **开发者优先** — REST API、CLI（`npx tradeclaw`）、Webhooks、插件、为 AI 助手打造的 MCP 服务器
- **120+ 页面** — 仪表盘、回测、筛选器、模拟交易、Telegram 机器人、信号回放等更多功能

## 快速开始

```bash
# 方式一：Docker Hub（最快 — 无需克隆仓库）
docker pull tradeclaw/tradeclaw
docker run -p 3000:3000 tradeclaw/tradeclaw
# → hub.docker.com/r/tradeclaw/tradeclaw (linux/amd64 + linux/arm64)

# 方式一（补充）：Docker Compose（带 .env 配置）
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d

# 方式二：npx 演示（无需安装）
npx tradeclaw-demo

# 方式三：命令行
npx tradeclaw signals --pair BTCUSD --limit 5
```

打开 [http://localhost:3000](http://localhost:3000) — 仪表盘即刻可用。

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw/tree/main/apps/web)

## 功能特性

| 类别 | 功能描述 |
|------|---------|
| 📊 **信号** | RSI、MACD、EMA、布林带、随机指标 — 5 指标共振评分 |
| 🎯 **资产** | BTCUSD、ETHUSD、XAUUSD、XAGUSD、EURUSD、GBPUSD、USDJPY 等更多 |
| ⏱️ **时间周期** | M5、M15、H1、H4、D1 + 多时间周期共振视图 |
| 📱 **移动端** | 响应式 PWA — 可安装，支持离线 |
| 🤖 **自动化** | Telegram 机器人、Discord/Slack Webhooks、自定义 JS 插件 |
| 🔌 **API** | REST API，支持 API 密钥、速率限制、shields.io 徽章 |
| 🖥️ **命令行** | `npx tradeclaw signals` — 在终端获取信号 |
| 🧠 **AI** | 支持 Claude Desktop 的 MCP 服务器、AI 信号解读 |
| 📈 **回测** | Canvas 图表，含 RSI/MACD 叠加层、CSV 导出、月度热力图 |
| 🎮 **模拟交易** | 虚拟 $10k 组合、自动跟踪信号、收益曲线 |

## TradeClaw 与其他平台对比

| 功能 | TradeClaw | TradingView | 3Commas |
|------|-----------|-------------|---------|
| 自托管 | ✅ | ❌ | ❌ |
| 开源 | ✅ | ❌ | ❌ |
| 永久免费 | ✅ | ❌（$15/月起） | ❌（$29/月起） |
| REST API | ✅ | ❌（付费） | ✅ |
| Telegram 机器人 | ✅ 内置 | ❌ | ✅ 付费 |
| 自定义插件 | ✅ | Pine Script | ❌ |
| MCP / AI 原生 | ✅ | ❌ | ❌ |

## 技术栈

Next.js 15 · TypeScript 5 · Tailwind CSS v4 · Node.js 22 · Docker

## 嵌入你的投资组合

通过可嵌入的小组件，在任何地方分享你的模拟交易表现：

```html
<!-- Iframe 嵌入（暗色主题，每 30 秒自动刷新） -->
<iframe src="https://tradeclaw.win/api/widget/portfolio/embed?theme=dark" width="320" height="200" frameborder="0" style="border-radius:12px"></iframe>
```

```markdown
<!-- Shields.io 徽章，适用于你的 README -->
[![TradeClaw Portfolio](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fwidget%2Fportfolio%2Fbadge&style=for-the-badge)](https://tradeclaw.win/paper-trading)
```

```markdown
<!-- SVG 徽章（无需外部服务） -->
[![TradeClaw Portfolio](https://tradeclaw.win/api/widget/badge)](https://tradeclaw.win/paper-trading)
```

JSON API：`GET /api/widget/portfolio` — 返回余额、净值、盈亏、胜率。[小组件展示 &rarr;](https://tradeclaw.win/widgets)

## 实时信号徽章

在你的 README 中直接嵌入 BTC、ETH 和黄金的实时信号徽章 — 每 5 分钟自动刷新，无需 API 密钥。

[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win/signal/BTCUSD-H1-BUY)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win/signal/ETHUSD-H1-BUY)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win/signal/XAUUSD-H1-BUY)
[![EUR/USD Signal](https://tradeclaw.win/api/badge/EURUSD)](https://tradeclaw.win/signal/EURUSD-H1-BUY)

```markdown
<!-- 粘贴到任意 README — 显示实时买入/卖出和置信度百分比 -->
[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

```markdown
<!-- 或通过 shields.io（友好的缓存清除机制） -->
[![BTC Signal](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2FBTCUSD%2Fjson)](https://tradeclaw.win)
[![ETH Signal](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2FETHUSD%2Fjson)](https://tradeclaw.win)
```

URL 格式：`https://tradeclaw.win/api/badge/{PAIR}?tf={H1|H4|D1}` · [查看所有徽章交易对 &rarr;](https://tradeclaw.win/badge)

## GitHub Action

在 CI/CD 流水线中获取实时信号：

```yaml
- name: Get BTC signal
  uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  id: signal
  with:
    pair: BTCUSD
    timeframe: H1
    min_confidence: 70

- name: Deploy if confident
  if: success()
  run: npm run deploy
```

根据市场条件控制部署、运行定时信号检查、使用矩阵策略扫描多个交易对。[Action 文档 &rarr;](https://tradeclaw.win/action) &middot; [应用商店 &rarr;](https://github.com/marketplace/actions/tradeclaw-signal)

## Discord 机器人

将 TradeClaw 添加到你的 Discord 服务器，获取实时交易信号：

```bash
cd packages/tradeclaw-discord
npm install
DISCORD_BOT_TOKEN=your_token node bin/bot.js
```

**斜杠命令：** `/signal`、`/leaderboard`、`/health`、`/subscribe`、`/unsubscribe`、`/help`

[Discord 部署指南 &rarr;](https://tradeclaw.win/discord) &middot; [机器人源码 &rarr;](https://github.com/naimkatiman/tradeclaw/tree/main/packages/tradeclaw-discord)

## 参与贡献

我们欢迎 PR！查看我们的 **[入门 Issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** 和 **[贡献指南](https://tradeclaw.win/contribute)**。

```
⭐ 为这个仓库点个 Star，帮助更多人发现 TradeClaw
```

## 支持项目

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors)](https://github.com/sponsors/naimkatiman)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/naimkatiman)

---

<div align="center">
<sub>MIT 许可证 · 用 ⚡ 打造 · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
