<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw 로고" width="88" height="88" />

<h1>TradeClaw</h1>
<p><strong>오픈소스 AI 트레이딩 시그널 플랫폼. 셀프 호스팅. 영원히 무료.</strong></p>
<p>RSI · MACD · EMA · 볼린저 밴드 · 스토캐스틱 — 하나의 대시보드로 완결. 2분 안에 배포.</p>

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/데모-라이브-10b981?logo=vercel)](https://tradeclaw.win/dashboard)

**[🚀 라이브 데모](https://tradeclaw.win/dashboard)** · **[📡 API 문서](https://tradeclaw.win/api-docs)** · **[🤝 기여하기](https://tradeclaw.win/contribute)**

🌍 [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | **한국어** | [모든 언어](LANGUAGES.md)

</div>

---

## TradeClaw를 선택하는 이유

- **구독료 없음** — 셀프 호스팅으로 데이터를 직접 소유, 비용 $0
- **실제 시그널** — RSI/MACD/EMA/볼린저 밴드/스토캐스틱 복합 점수 산출, Binance + Yahoo Finance에서 실시간 수신
- **개발자 친화적** — REST API, CLI(`npx tradeclaw`), 웹훅, 플러그인, AI 어시스턴트용 MCP 서버
- **120개 이상의 페이지** — 대시보드, 백테스트, 스크리너, 모의 거래, 텔레그램 봇, 시그널 리플레이 등

## 빠른 시작

```bash
# 방법 1: Docker Hub (가장 빠름 — 클론 불필요)
docker pull tradeclaw/tradeclaw
docker run -p 3000:3000 tradeclaw/tradeclaw

# 방법 1b: Docker Compose (.env 포함)
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
docker compose up -d

# 방법 2: npx 데모 (설치 불필요)
npx tradeclaw-demo

# 방법 3: CLI
npx tradeclaw signals --pair BTCUSD --limit 5
```

[http://localhost:3000](http://localhost:3000)을 열면 — 대시보드가 바로 실행됩니다.

[![Railway에 배포](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)

## 주요 기능

| 카테고리 | 내용 |
|---------|------|
| 📊 **시그널** | RSI, MACD, EMA, 볼린저 밴드, 스토캐스틱 — 5가지 지표 복합 점수 |
| 🎯 **자산** | BTCUSD, ETHUSD, XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY 등 |
| ⏱️ **시간대** | M5, M15, H1, H4, D1 + 멀티 타임프레임 공명 뷰 |
| 📱 **모바일** | 반응형 PWA — 설치 가능, 오프라인 지원 |
| 🤖 **자동화** | 텔레그램 봇, Discord/Slack 웹훅, 커스텀 JS 플러그인 |
| 🔌 **API** | API 키·속도 제한·shields.io 뱃지를 갖춘 REST API |
| 🖥️ **CLI** | `npx tradeclaw signals` — 터미널에서 시그널 조회 |
| 🧠 **AI** | Claude Desktop용 MCP 서버, AI 시그널 해설 |
| 📈 **백테스트** | RSI/MACD 오버레이가 포함된 Canvas 차트, CSV 내보내기, 월간 히트맵 |
| 🎮 **모의 거래** | 가상 $10,000 포트폴리오, 시그널 자동 추종, 자본 곡선 |

## TradeClaw vs 경쟁 서비스

| 기능 | TradeClaw | TradingView | 3Commas |
|------|-----------|-------------|---------|
| 셀프 호스팅 | ✅ | ❌ | ❌ |
| 오픈소스 | ✅ | ❌ | ❌ |
| 영구 무료 | ✅ | ❌ ($15/월~) | ❌ ($29/월~) |
| REST API | ✅ | ❌ (유료) | ✅ |
| 텔레그램 봇 | ✅ 내장 | ❌ | ✅ 유료 |
| 커스텀 플러그인 | ✅ | Pine Script | ❌ |
| MCP / AI 네이티브 | ✅ | ❌ | ❌ |

## 기술 스택

Next.js 15 · TypeScript 5 · Tailwind CSS v4 · Node.js 22 · Docker

## 라이브 시그널 뱃지

BTC, ETH, 골드의 실시간 시그널 뱃지를 README에 삽입하세요 — 5분마다 자동 갱신, API 키 불필요.

```markdown
[![BTC 시그널](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH 시그널](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![골드 시그널](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

## 기여하기

PR을 환영합니다! **[초보자 친화 Issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** 와 **[기여 가이드](https://tradeclaw.win/contribute)** 를 확인해 주세요.

```
⭐ 이 저장소에 스타를 눌러 더 많은 사람들이 TradeClaw를 발견하도록 도와주세요
```

---

<div align="center">
<sub>MIT 라이선스 · ⚡ 로 제작 · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
