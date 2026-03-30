<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="88" height="88" />

<a href="https://tradeclaw.win/dashboard">
  <img src="apps/web/public/tradeclaw-demo.gif" alt="TradeClaw 대시보드 데모" width="100%" />
</a>

<h1>TradeClaw</h1>
<p><strong>오픈소스 AI 트레이딩 시그널 플랫폼. 셀프호스팅. 영원히 무료.</strong></p>
<p>RSI · MACD · EMA · 볼린저 밴드 · 스토캐스틱 — 하나의 대시보드에 모두 통합. 2분 만에 배포 완료.</p>

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=social)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?color=10b981)](https://github.com/naimkatiman/tradeclaw/commits/main)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?logo=docker)](https://hub.docker.com/r/tradeclaw/tradeclaw)
[![Demo](https://img.shields.io/badge/Demo-Live-10b981?logo=vercel)](https://tradeclaw.win/dashboard)
[![GitHub Action](https://img.shields.io/badge/Action-Marketplace-2088FF?logo=github-actions)](https://github.com/marketplace/actions/tradeclaw-signal)

**[🚀 라이브 데모](https://tradeclaw.win/dashboard)** · **[📡 API 문서](https://tradeclaw.win/api-docs)** · **[🤝 기여하기](https://tradeclaw.win/contribute)**

🌍 [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | **한국어**

</div>

---

## 왜 TradeClaw인가?

- **구독료 없음** — 셀프호스팅으로 데이터를 직접 관리하고, 비용은 $0
- **실전 시그널** — RSI/MACD/EMA/볼린저/스토캐스틱 컨플루언스 스코어링, Binance + Yahoo Finance에서 실시간 데이터 수집
- **개발자 우선** — REST API, CLI(`npx tradeclaw`), Webhooks, 플러그인, AI 어시스턴트를 위한 MCP 서버
- **120개 이상의 페이지** — 대시보드, 백테스트, 스크리너, 모의 트레이딩, Telegram 봇, 시그널 리플레이 등

## 빠른 시작

```bash
# 방법 1: Docker Hub (가장 빠름 — 클론 필요 없음)
docker pull tradeclaw/tradeclaw
docker run -p 3000:3000 tradeclaw/tradeclaw
# → hub.docker.com/r/tradeclaw/tradeclaw (linux/amd64 + linux/arm64)

# 방법 1b: Docker Compose (.env 포함)
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d

# 방법 2: npx 데모 (설치 불필요)
npx tradeclaw-demo

# 방법 3: CLI
npx tradeclaw signals --pair BTCUSD --limit 5
```

[http://localhost:3000](http://localhost:3000)을 열면 — 대시보드가 바로 실행됩니다.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw/tree/main/apps/web)

## 주요 기능

| 카테고리 | 기능 설명 |
|---------|----------|
| 📊 **시그널** | RSI, MACD, EMA, 볼린저, 스토캐스틱 — 5개 지표 컨플루언스 스코어링 |
| 🎯 **자산** | BTCUSD, ETHUSD, XAUUSD, XAGUSD, EURUSD, GBPUSD, USDJPY 외 다수 |
| ⏱️ **타임프레임** | M5, M15, H1, H4, D1 + 멀티 타임프레임 컨플루언스 뷰 |
| 📱 **모바일** | 반응형 PWA — 설치 가능, 오프라인 지원 |
| 🤖 **자동화** | Telegram 봇, Discord/Slack Webhooks, 커스텀 JS 플러그인 |
| 🔌 **API** | REST API, API 키, 속도 제한, shields.io 배지 지원 |
| 🖥️ **CLI** | `npx tradeclaw signals` — 터미널에서 시그널 조회 |
| 🧠 **AI** | Claude Desktop용 MCP 서버, AI 시그널 해석 |
| 📈 **백테스트** | Canvas 차트(RSI/MACD 오버레이), CSV 내보내기, 월별 히트맵 |
| 🎮 **모의 트레이딩** | 가상 $10k 포트폴리오, 시그널 자동 추종, 수익 곡선 |

## TradeClaw vs 다른 서비스

| 기능 | TradeClaw | TradingView | 3Commas |
|------|-----------|-------------|---------|
| 셀프호스팅 | ✅ | ❌ | ❌ |
| 오픈소스 | ✅ | ❌ | ❌ |
| 영원히 무료 | ✅ | ❌ ($15/월~) | ❌ ($29/월~) |
| REST API | ✅ | ❌ (유료) | ✅ |
| Telegram 봇 | ✅ 내장 | ❌ | ✅ 유료 |
| 커스텀 플러그인 | ✅ | Pine Script | ❌ |
| MCP / AI 네이티브 | ✅ | ❌ | ❌ |

## 기술 스택

Next.js 15 · TypeScript 5 · Tailwind CSS v4 · Node.js 22 · Docker

## 포트폴리오 임베드

임베드 위젯으로 모의 트레이딩 성과를 어디서든 공유할 수 있습니다:

```html
<!-- Iframe 임베드 (다크 테마, 30초마다 자동 새로고침) -->
<iframe src="https://tradeclaw.win/api/widget/portfolio/embed?theme=dark" width="320" height="200" frameborder="0" style="border-radius:12px"></iframe>
```

```markdown
<!-- Shields.io 배지 (README용) -->
[![TradeClaw Portfolio](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fwidget%2Fportfolio%2Fbadge&style=for-the-badge)](https://tradeclaw.win/paper-trading)
```

```markdown
<!-- SVG 배지 (외부 서비스 불필요) -->
[![TradeClaw Portfolio](https://tradeclaw.win/api/widget/badge)](https://tradeclaw.win/paper-trading)
```

JSON API: `GET /api/widget/portfolio` — 잔액, 순자산, 손익, 승률을 반환합니다. [위젯 갤러리 &rarr;](https://tradeclaw.win/widgets)

## 실시간 시그널 배지

BTC, ETH, 금 시그널 배지를 README에 바로 임베드하세요 — 5분마다 자동 갱신, API 키 불필요.

[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win/signal/BTCUSD-H1-BUY)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win/signal/ETHUSD-H1-BUY)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win/signal/XAUUSD-H1-BUY)
[![EUR/USD Signal](https://tradeclaw.win/api/badge/EURUSD)](https://tradeclaw.win/signal/EURUSD-H1-BUY)

```markdown
<!-- 아무 README에 붙여넣기 — 실시간 매수/매도 시그널과 신뢰도 %를 표시 -->
[![BTC Signal](https://tradeclaw.win/api/badge/BTCUSD)](https://tradeclaw.win)
[![ETH Signal](https://tradeclaw.win/api/badge/ETHUSD)](https://tradeclaw.win)
[![Gold Signal](https://tradeclaw.win/api/badge/XAUUSD)](https://tradeclaw.win)
```

```markdown
<!-- 또는 shields.io 경유 (캐시 버스팅 지원) -->
[![BTC Signal](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2FBTCUSD%2Fjson)](https://tradeclaw.win)
[![ETH Signal](https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2FETHUSD%2Fjson)](https://tradeclaw.win)
```

URL 형식: `https://tradeclaw.win/api/badge/{PAIR}?tf={H1|H4|D1}` · [전체 배지 페어 보기 &rarr;](https://tradeclaw.win/badge)

## GitHub Action

CI/CD 파이프라인에서 실시간 시그널을 가져올 수 있습니다:

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

시장 상황에 따라 배포를 제어하고, 정기 시그널 체크를 실행하며, 매트릭스 전략으로 여러 페어를 스캔하세요. [Action 문서 &rarr;](https://tradeclaw.win/action) &middot; [마켓플레이스 &rarr;](https://github.com/marketplace/actions/tradeclaw-signal)

## Discord 봇

TradeClaw를 Discord 서버에 추가하여 실시간 트레이딩 시그널을 받아보세요:

```bash
cd packages/tradeclaw-discord
npm install
DISCORD_BOT_TOKEN=your_token node bin/bot.js
```

**슬래시 명령어:** `/signal`, `/leaderboard`, `/health`, `/subscribe`, `/unsubscribe`, `/help`

[Discord 설정 가이드 &rarr;](https://tradeclaw.win/discord) &middot; [봇 소스코드 &rarr;](https://github.com/naimkatiman/tradeclaw/tree/main/packages/tradeclaw-discord)

## 기여하기

PR을 환영합니다! **[첫 기여 이슈](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue)** 와 **[기여 가이드](https://tradeclaw.win/contribute)** 를 확인해 주세요.

```
⭐ 이 저장소에 Star를 눌러 더 많은 사람들이 TradeClaw를 발견할 수 있도록 도와주세요
```

## 프로젝트 후원

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors)](https://github.com/sponsors/naimkatiman)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/naimkatiman)

---

<div align="center">
<sub>MIT 라이선스 · ⚡로 제작 · <a href="https://tradeclaw.win">tradeclaw.win</a></sub>
</div>
