<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw 标志" width="88" height="88" />

<h1>TradeClaw</h1>
<p><strong>开源 AI 交易信号平台。自托管。永久免费。</strong></p>
<p>RSI · MACD · EMA · 布林带 · 随机指标 — 一个仪表盘全搞定。2分钟内部署。</p>

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/演示-在线-10b981?logo=vercel)](https://tradeclaw.win/dashboard)

**[🚀 在线演示](https://tradeclaw.win/dashboard)** · **[📡 API 文档](https://tradeclaw.win/api-docs)** · **[🤝 参与贡献](https://tradeclaw.win/contribute)**

🌍 [English](README.md) | **中文** | [日本語](README.ja.md) | [한국어](README.ko.md) | [所有语言](LANGUAGES.md)

</div>

---

## 为什么选择 TradeClaw？

- **零订阅费** — 自托管，数据归你所有，完全免费
- **真实信号** — RSI/MACD/EMA/布林带/随机指标多重确认评分，实时来自 Binance + Yahoo Finance
- **开发者优先** — REST API、CLI（`npx tradeclaw`）、Webhooks、插件系统、适用于 AI 助手的 MCP 服务器
- **120+ 页面** — 仪表盘、回测、筛选器、模拟交易、Telegram 机器人、信号回放等

## 快速开始

```bash
# 方式一：Docker Hub（最快 — 无需克隆）
docker pull tradeclaw/tradeclaw
docker run -p 3000:3000 tradeclaw/tradeclaw

# 方式一b：Docker Compose（含 .env）
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
docker compose up -d

# 方式二：npx 演示（无需安装）
npx tradeclaw-demo

# 方式三：CLI
npx tradeclaw signals --pair BTCUSD --limit 5
```

打开 [http://localhost:3000](http://localhost:3000) — 仪表盘即刻运行。

[![部署到 Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)

## 功能特性

| 分类 | 功能说明 |
|------|---------|
| 📊 **信号** | RSI、MACD、EMA、布林带、随机指标 — 5 重指标确认评分 |
| 🎯 **资产** | BTCUSD、ETHUSD、XAUUSD、XAGUSD、EURUSD、GBPUSD、USDJPY 等 |
| ⏱️ **周期** | M5、M15、H1、H4、D1 + 多周期共振视图 |
| 📱 **移动端** | 响应式 PWA — 可安装，支持离线 |
| 🤖 **自动化** | Telegram 机器人、Discord/Slack Webhook、自定义 JS 插件 |
| 🔌 **API** | 带 API 密钥、速率限制、shields.io 徽章的 REST API |
| 🖥️ **CLI** | `npx tradeclaw signals` — 在终端获取信号 |
| 🧠 **AI** | 适用于 Claude Desktop 的 MCP 服务器，AI 信号解释 |
| 📈 **回测** | Canvas 图表含 RSI/MACD 叠加层、CSV 导出、月度热力图 |
| 🎮 **模拟交易** | 虚拟 $10,000 资金，自动跟随信号，净值曲线 |

## TradeClaw 对比竞品

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

## 实时信号徽章

将实时 BTC、ETH 和黄金信号徽章嵌入你的 README — 每 5 分钟自动刷新，无需 API 密钥。

```markdown
[![BTC 信号](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH 信号](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![黄金信号](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

## 贡献

欢迎提交 PR！查看我们的 **[新手友好 Issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** 和 **[贡献指南](https://tradeclaw.win/contribute)**。

```
⭐ 给这个项目点星，帮助更多人发现 TradeClaw
```

---

<div align="center">
<sub>MIT 许可证 · 用 ⚡ 构建 · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
