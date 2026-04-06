<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw ロゴ" width="88" height="88" />

<h1>TradeClaw</h1>
<p><strong>オープンソースのAIトレードシグナルプラットフォーム。セルフホスト対応。永久無料。</strong></p>
<p>RSI · MACD · EMA · ボリンジャーバンド · ストキャスティクス — ひとつのダッシュボードで完結。2分でデプロイ。</p>

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/デモ-ライブ-10b981?logo=vercel)](https://tradeclaw.win/dashboard)

**[🚀 ライブデモ](https://tradeclaw.win/dashboard)** · **[📡 APIドキュメント](https://tradeclaw.win/api-docs)** · **[🤝 コントリビュート](https://tradeclaw.win/contribute)**

🌍 [English](README.md) | [中文](README.zh.md) | **日本語** | [한국어](README.ko.md) | [全言語](LANGUAGES.md)

</div>

---

## TradeClaw を選ぶ理由

- **サブスクリプション不要** — セルフホストで、データはあなたのもの、費用は$0
- **リアルなシグナル** — RSI/MACD/EMA/ボリンジャーバンド/ストキャスティクスの複合スコアリング、Binance + Yahoo Finance からリアルタイム取得
- **開発者ファースト** — REST API、CLI（`npx tradeclaw`）、Webhook、プラグイン、AIアシスタント向けMCPサーバー
- **120以上のページ** — ダッシュボード、バックテスト、スクリーナー、ペーパートレード、Telegramボット、シグナルリプレイなど

## クイックスタート

```bash
# 方法1: Docker Hub（最速 — クローン不要）
docker pull tradeclaw/tradeclaw
docker run -p 3000:3000 tradeclaw/tradeclaw

# 方法1b: Docker Compose（.env あり）
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
docker compose up -d

# 方法2: npx デモ（インストール不要）
npx tradeclaw-demo

# 方法3: CLI
npx tradeclaw signals --pair BTCUSD --limit 5
```

[http://localhost:3000](http://localhost:3000) を開く — ダッシュボードがすぐに起動します。

[![Railway にデプロイ](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)

## 機能一覧

| カテゴリ | 内容 |
|---------|------|
| 📊 **シグナル** | RSI、MACD、EMA、ボリンジャーバンド、ストキャスティクス — 5指標複合スコアリング |
| 🎯 **アセット** | BTCUSD、ETHUSD、XAUUSD、XAGUSD、EURUSD、GBPUSD、USDJPY など |
| ⏱️ **時間足** | M5、M15、H1、H4、D1 + マルチタイムフレーム共鳴ビュー |
| 📱 **モバイル** | レスポンシブPWA — インストール可能、オフライン対応 |
| 🤖 **自動化** | Telegramボット、Discord/Slack Webhook、カスタムJSプラグイン |
| 🔌 **API** | APIキー・レート制限・shields.ioバッジ付きREST API |
| 🖥️ **CLI** | `npx tradeclaw signals` — ターミナルからシグナルを取得 |
| 🧠 **AI** | Claude Desktop向けMCPサーバー、AIシグナル解説 |
| 📈 **バックテスト** | RSI/MACDオーバーレイ付きCanvasチャート、CSVエクスポート、月次ヒートマップ |
| 🎮 **ペーパートレード** | 仮想$10,000ポートフォリオ、シグナル自動追従、資産曲線 |

## TradeClaw vs 競合他社

| 機能 | TradeClaw | TradingView | 3Commas |
|------|-----------|-------------|---------|
| セルフホスト | ✅ | ❌ | ❌ |
| オープンソース | ✅ | ❌ | ❌ |
| 永久無料 | ✅ | ❌（$15/月〜） | ❌（$29/月〜） |
| REST API | ✅ | ❌（有料） | ✅ |
| Telegramボット | ✅ 組み込み | ❌ | ✅ 有料 |
| カスタムプラグイン | ✅ | Pine Script | ❌ |
| MCP / AIネイティブ | ✅ | ❌ | ❌ |

## 技術スタック

Next.js 15 · TypeScript 5 · Tailwind CSS v4 · Node.js 22 · Docker

## ライブシグナルバッジ

BTC、ETH、ゴールドのリアルタイムシグナルバッジをREADMEに埋め込めます — 5分ごとに自動更新、APIキー不要。

```markdown
[![BTCシグナル](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETHシグナル](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![ゴールドシグナル](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

## コントリビュート

PRを歓迎します！**[初心者向けIssues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** と **[コントリビュートガイド](https://tradeclaw.win/contribute)** をご確認ください。

```
⭐ このリポジトリにスターを付けて、より多くの人にTradeClaw を届けましょう
```

---

<div align="center">
<sub>MITライセンス · ⚡ で構築 · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
