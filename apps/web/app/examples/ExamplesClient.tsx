"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ChevronDown, ChevronUp, Star, BookOpen, Webhook } from "lucide-react";

interface BotExample {
  id: string;
  language: string;
  badgeColor: string;
  title: string;
  description: string;
  prerequisites: string[];
  code: string;
}

const BOTS: BotExample[] = [
  {
    id: "python",
    language: "Python",
    badgeColor: "bg-blue-600",
    title: "Python Signal Poller",
    description:
      "Poll TradeClaw every 5 minutes and send BUY/SELL alerts to Telegram with emoji badges.",
    prerequisites: ["Python 3.8+", "pip install requests"],
    code: [
      "import requests",
      "import time",
      "import os",
      "",
      'API_URL = "https://tradeclaw.win/api/signals"',
      'TG_TOKEN = os.environ["TG_BOT_TOKEN"]',
      'TG_CHAT  = os.environ["TG_CHAT_ID"]',
      "",
      "seen = set()",
      "",
      "def send_telegram(text: str):",
      '    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"',
      '    requests.post(url, json={"chat_id": TG_CHAT, "text": text, "parse_mode": "HTML"})',
      "",
      "def poll():",
      "    res = requests.get(API_URL, timeout=10)",
      '    signals = res.json().get("data", [])',
      "    for s in signals:",
      '        sid = s["id"]',
      "        if sid in seen:",
      "            continue",
      "        seen.add(sid)",
      '        emoji = "\\u2705" if s["direction"] == "BUY" else "\\U0001f534"',
      "        msg = (",
      '            f"{emoji} <b>{s[\'direction\']}</b> {s[\'symbol\']}\\n"',
      '            f"Price: {s[\'price\']}  |  Score: {s[\'score\']}"',
      "        )",
      "        send_telegram(msg)",
      '        print(f"Sent: {s[\'direction\']} {s[\'symbol\']}")',
      "",
      'if __name__ == "__main__":',
      '    print("TradeClaw Python bot started")',
      "    while True:",
      "        try:",
      "            poll()",
      "        except Exception as e:",
      '            print(f"Error: {e}")',
      "        time.sleep(300)",
    ].join("\n"),
  },
  {
    id: "nodejs",
    language: "Node.js",
    badgeColor: "bg-green-600",
    title: "Node.js Signal Poller",
    description:
      "Zero-dependency Node 18+ bot using built-in fetch. Polls signals and sends Telegram alerts.",
    prerequisites: ["Node.js 18+", "No external packages needed"],
    code: [
      'const API_URL = "https://tradeclaw.win/api/signals";',
      "const TG_TOKEN = process.env.TG_BOT_TOKEN;",
      "const TG_CHAT  = process.env.TG_CHAT_ID;",
      "",
      "const seen = new Set();",
      "",
      "async function sendTelegram(text) {",
      "  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {",
      '    method: "POST",',
      '    headers: { "Content-Type": "application/json" },',
      '    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML" }),',
      "  });",
      "}",
      "",
      "async function poll() {",
      "  const res = await fetch(API_URL);",
      "  const { data = [] } = await res.json();",
      "  for (const s of data) {",
      "    if (seen.has(s.id)) continue;",
      "    seen.add(s.id);",
      '    const emoji = s.direction === "BUY" ? "\\u2705" : "\\uD83D\\uDD34";',
      "    const msg = `${emoji} <b>${s.direction}</b> ${s.symbol}\\nPrice: ${s.price}  |  Score: ${s.score}`;",
      "    await sendTelegram(msg);",
      "    console.log(`Sent: ${s.direction} ${s.symbol}`);",
      "  }",
      "}",
      "",
      'console.log("TradeClaw Node.js bot started");',
      "setInterval(async () => {",
      "  try { await poll(); }",
      '  catch (e) { console.error("Error:", e.message); }',
      "}, 5 * 60 * 1000);",
      "poll();",
    ].join("\n"),
  },
  {
    id: "bash",
    language: "Bash",
    badgeColor: "bg-zinc-600",
    title: "Bash Signal Watcher",
    description:
      "Lightweight shell script using curl and jq. Tracks seen IDs in a temp file to avoid duplicates.",
    prerequisites: ["curl", "jq", "bash 4+"],
    code: [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "",
      'API_URL="https://tradeclaw.win/api/signals"',
      'TG_TOKEN="${TG_BOT_TOKEN:?Set TG_BOT_TOKEN}"',
      'TG_CHAT="${TG_CHAT_ID:?Set TG_CHAT_ID}"',
      'SEEN_FILE="/tmp/tradeclaw_seen_ids.txt"',
      "",
      'touch "$SEEN_FILE"',
      "",
      "send_tg() {",
      '  curl -s -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \\',
      '    -H "Content-Type: application/json" \\',
      '    -d "{\\"chat_id\\":\\"$TG_CHAT\\",\\"text\\":\\"$1\\",\\"parse_mode\\":\\"HTML\\"}" \\',
      "    > /dev/null",
      "}",
      "",
      'echo "TradeClaw Bash watcher started"',
      "while true; do",
      '  SIGNALS=$(curl -s "$API_URL")',
      "  COUNT=$(echo \"$SIGNALS\" | jq '.data | length')",
      "",
      "  for ((i=0; i<COUNT; i++)); do",
      '    ID=$(echo "$SIGNALS" | jq -r ".data[$i].id")',
      '    if grep -qx "$ID" "$SEEN_FILE"; then continue; fi',
      '    echo "$ID" >> "$SEEN_FILE"',
      "",
      '    DIR=$(echo "$SIGNALS" | jq -r ".data[$i].direction")',
      '    SYM=$(echo "$SIGNALS" | jq -r ".data[$i].symbol")',
      '    PRC=$(echo "$SIGNALS" | jq -r ".data[$i].price")',
      "",
      '    EMOJI=$( [ "$DIR" = "BUY" ] && echo "\\u2705" || echo "\\uD83D\\uDD34" )',
      '    send_tg "$EMOJI <b>$DIR</b> $SYM - Price: $PRC"',
      '    echo "Sent: $DIR $SYM"',
      "  done",
      "  sleep 300",
      "done",
    ].join("\n"),
  },
  {
    id: "curl",
    language: "cURL",
    badgeColor: "bg-orange-600",
    title: "cURL One-Liners",
    description:
      "Five quick one-liners for testing the API from your terminal. No script needed.",
    prerequisites: ["curl", "jq (optional, for formatting)"],
    code: [
      "# 1. Fetch latest signals",
      "curl -s https://tradeclaw.win/api/signals | jq .",
      "",
      "# 2. Get direction of the top signal",
      "curl -s https://tradeclaw.win/api/signals | jq '.data[0].direction'",
      "",
      "# 3. Send a signal to Telegram",
      'curl -s -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/sendMessage" \\',
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"chat_id":"\'$TG_CHAT_ID\'","text":"New signal from TradeClaw!"}\'',
      "",
      "# 4. Check the leaderboard",
      "curl -s https://tradeclaw.win/api/leaderboard | jq '.data[:5]'",
      "",
      "# 5. Health check",
      "curl -s https://tradeclaw.win/api/uptime | jq '{status, uptime_pct}'",
    ].join("\n"),
  },
  {
    id: "go",
    language: "Go",
    badgeColor: "bg-cyan-600",
    title: "Go Signal Poller",
    description:
      "Zero-dependency Go bot using net/http. Polls every 5 minutes, sends Telegram alerts.",
    prerequisites: ["Go 1.21+", "No external modules needed"],
    code: [
      "package main",
      "",
      "import (",
      '\t"encoding/json"',
      '\t"fmt"',
      '\t"net/http"',
      '\t"os"',
      '\t"strings"',
      '\t"time"',
      ")",
      "",
      "var (",
      '\tapiURL  = "https://tradeclaw.win/api/signals"',
      '\ttgToken = os.Getenv("TG_BOT_TOKEN")',
      '\ttgChat  = os.Getenv("TG_CHAT_ID")',
      "\tseen    = map[string]bool{}",
      ")",
      "",
      "type Signal struct {",
      '\tID        string  `json:"id"`',
      '\tDirection string  `json:"direction"`',
      '\tSymbol    string  `json:"symbol"`',
      '\tPrice     float64 `json:"price"`',
      '\tScore     float64 `json:"score"`',
      "}",
      "",
      'type APIResp struct{ Data []Signal `json:"data"` }',
      "",
      "func sendTG(text string) {",
      '\tbody := fmt.Sprintf(`{"chat_id":"%s","text":"%s","parse_mode":"HTML"}`, tgChat, text)',
      '\thttp.Post("https://api.telegram.org/bot"+tgToken+"/sendMessage",',
      '\t\t"application/json", strings.NewReader(body))',
      "}",
      "",
      "func poll() {",
      "\tresp, err := http.Get(apiURL)",
      '\tif err != nil { fmt.Println("Error:", err); return }',
      "\tdefer resp.Body.Close()",
      "\tvar r APIResp",
      "\tjson.NewDecoder(resp.Body).Decode(&r)",
      "\tfor _, s := range r.Data {",
      "\t\tif seen[s.ID] { continue }",
      "\t\tseen[s.ID] = true",
      '\t\temoji := "\\u2705"',
      '\t\tif s.Direction == "SELL" { emoji = "\\U0001f534" }',
      '\t\tmsg := fmt.Sprintf("%s <b>%s</b> %s\\nPrice: %.2f | Score: %.1f",',
      "\t\t\temoji, s.Direction, s.Symbol, s.Price, s.Score)",
      "\t\tsendTG(msg)",
      '\t\tfmt.Printf("Sent: %s %s\\n", s.Direction, s.Symbol)',
      "\t}",
      "}",
      "",
      "func main() {",
      '\tfmt.Println("TradeClaw Go bot started")',
      "\tpoll()",
      "\tfor range time.Tick(5 * time.Minute) { poll() }",
      "}",
    ].join("\n"),
  },
];

const COLLAPSED_LINES = 12;

export default function ExamplesClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleCopy(id: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getVisibleCode(bot: BotExample) {
    if (expandedId === bot.id) return bot.code;
    const lines = bot.code.split("\n");
    if (lines.length <= COLLAPSED_LINES) return bot.code;
    return lines.slice(0, COLLAPSED_LINES).join("\n") + "\n...";
  }

  function needsExpand(bot: BotExample) {
    return bot.code.split("\n").length > COLLAPSED_LINES;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="pt-32 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Copy &amp; Run
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            5-Minute Trading Bot
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Pick a language, paste the code, set two env vars, and you have a live
            Telegram trading alert bot powered by TradeClaw&apos;s public API.
          </p>
        </div>
      </section>

      {/* Bot Cards */}
      <section className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
        {BOTS.map((bot) => (
          <article
            key={bot.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`${bot.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-md`}
                >
                  {bot.language}
                </span>
                <h2 className="text-lg font-semibold">{bot.title}</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-3">{bot.description}</p>
              <div className="flex flex-wrap gap-2">
                {bot.prerequisites.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Code Block */}
            <div className="relative">
              <button
                onClick={() => handleCopy(bot.id, bot.code)}
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
                aria-label={`Copy ${bot.language} code`}
              >
                {copiedId === bot.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <pre className="bg-zinc-900 text-zinc-100 text-sm font-mono p-4 overflow-x-auto rounded-lg">
                <code>{getVisibleCode(bot)}</code>
              </pre>
              {needsExpand(bot) && (
                <button
                  onClick={() =>
                    setExpandedId(expandedId === bot.id ? null : bot.id)
                  }
                  className="w-full py-2 text-xs text-zinc-400 hover:text-white bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-1 transition-colors"
                >
                  {expandedId === bot.id ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show full code
                    </>
                  )}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to build?</h2>
        <p className="text-zinc-400 mb-8">
          Star the repo, explore the API, or set up webhooks for real-time alerts.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            API Docs
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            <Webhook className="w-4 h-4" />
            Webhook Docs
          </Link>
        </div>
      </section>
    </main>
  );
}
