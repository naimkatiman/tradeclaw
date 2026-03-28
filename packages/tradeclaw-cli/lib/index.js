"use strict";

const https = require("https");
const pc = require("picocolors");

const BASE_URL = "https://tradeclaw.win/api/v1";
const VERSION = "0.4.0";

const BANNER = `
${pc.bold(pc.green("  ████████╗ ██████╗"))}
${pc.bold(pc.green("     ██╔══╝██╔════╝"))}
${pc.bold(pc.green("     ██║   ██║"))}
${pc.bold(pc.green("     ██║   ██║"))}
${pc.bold(pc.green("     ██║   ╚██████╗"))}
${pc.bold(pc.green("     ╚═╝    ╚═════╝  ") + pc.dim("TradeClaw CLI v" + VERSION))}

${pc.dim("  Open-source AI trading signals · tradeclaw.win")}
${pc.dim("  ⭐ Star us: github.com/naimkatiman/tradeclaw")}
`;

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const url = BASE_URL + path;
    https.get(url, { headers: { "User-Agent": `tradeclaw-cli/${VERSION}` } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON response")); }
      });
    }).on("error", reject);
  });
}

function formatBar(value, max = 100, width = 20) {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return pc.green("█".repeat(filled)) + pc.dim("░".repeat(empty));
}

function formatDirection(dir) {
  return dir === "BUY"
    ? pc.bgGreen(pc.black(" BUY "))
    : pc.bgRed(pc.white(" SELL "));
}

function formatSignal(s, index) {
  const num = pc.dim(`${String(index + 1).padStart(2)}.`);
  const pair = pc.bold(pc.white(String(s.pair || s.symbol || "?").padEnd(10)));
  const dir = formatDirection(s.direction);
  const conf = s.confidence || 0;
  const bar = formatBar(conf, 100, 12);
  const confStr = pc.cyan(`${String(conf).padStart(3)}%`);
  const tf = pc.dim((s.timeframe || "H1").padEnd(4));
  const price = s.price || s.entry ? pc.dim(`@ ${s.price || s.entry}`) : "";
  return `  ${num} ${pair} ${dir}  ${bar} ${confStr}  ${tf} ${price}`;
}

function printHelp() {
  console.log(BANNER);
  console.log(pc.bold("USAGE"));
  console.log(`  ${pc.green("tradeclaw")} ${pc.cyan("<command>")} ${pc.dim("[options]")}`);
  console.log();
  console.log(pc.bold("COMMANDS"));
  const cmds = [
    ["signals", "Fetch live AI trading signals"],
    ["  --pair <PAIR>", "Filter by pair (e.g. BTCUSD, XAUUSD, EURUSD)"],
    ["  --direction <DIR>", "Filter BUY or SELL signals"],
    ["  --timeframe <TF>", "Filter by timeframe: M5, M15, H1, H4, D1"],
    ["  --limit <N>", "Number of signals (default: 10)"],
    ["leaderboard", "Show signal accuracy leaderboard"],
    ["  --period <P>", "Period: 7d, 30d, all (default: 30d)"],
    ["health", "Check TradeClaw API status"],
    ["badge <PAIR>", "Show live signal badge for a pair (e.g. BTCUSD)"],
    ["version", "Show version info"],
    ["help", "Show this help"],
  ];
  for (const [cmd, desc] of cmds) {
    if (cmd.startsWith("  ")) {
      console.log(`    ${pc.dim(cmd.trim().padEnd(22))} ${pc.dim(desc)}`);
    } else {
      console.log(`  ${pc.green(cmd.padEnd(24))} ${desc}`);
    }
  }
  console.log();
  console.log(pc.bold("EXAMPLES"));
  console.log(`  ${pc.dim("$")} tradeclaw signals`);
  console.log(`  ${pc.dim("$")} tradeclaw signals --pair BTCUSD --direction BUY`);
  console.log(`  ${pc.dim("$")} tradeclaw signals --timeframe H4 --limit 5`);
  console.log(`  ${pc.dim("$")} tradeclaw leaderboard --period 7d`);
  console.log(`  ${pc.dim("$")} tradeclaw badge XAUUSD`);
  console.log();
  console.log(pc.dim("  Docs: https://tradeclaw.win/docs"));
  console.log(pc.dim("  API:  https://tradeclaw.win/api-docs"));
  console.log(pc.dim("  Repo: https://github.com/naimkatiman/tradeclaw"));
  console.log();
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      opts[key] = argv[i + 1] ?? true;
      i++;
    } else {
      opts._rest = [...(opts._rest || []), argv[i]];
    }
  }
  return opts;
}

class TradeclawCLI {
  async run(argv) {
    const [command, ...rest] = argv;
    const opts = parseArgs(rest);

    switch (command) {
      case "signals":
      case "s":
        await this.cmdSignals(opts);
        break;
      case "leaderboard":
      case "lb":
        await this.cmdLeaderboard(opts);
        break;
      case "health":
        await this.cmdHealth();
        break;
      case "badge":
        await this.cmdBadge(opts._rest?.[0]);
        break;
      case "version":
      case "-v":
      case "--version":
        console.log(`tradeclaw v${VERSION}`);
        break;
      case "help":
      case "-h":
      case "--help":
      case undefined:
        printHelp();
        break;
      default:
        console.error(pc.red(`Unknown command: ${command}`));
        console.log(`Run ${pc.cyan("tradeclaw help")} for usage.`);
        process.exit(1);
    }
  }

  async cmdSignals(opts) {
    const params = new URLSearchParams();
    if (opts.pair) params.set("pair", opts.pair.toUpperCase());
    if (opts.direction) params.set("direction", opts.direction.toUpperCase());
    if (opts.timeframe) params.set("timeframe", opts.timeframe.toUpperCase());
    params.set("limit", String(opts.limit || 10));

    const spinner = this._spinner("Fetching live signals...");
    try {
      const data = await fetchJson(`/signals?${params}`);
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");

      if (!data.ok || !data.signals?.length) {
        console.log(pc.yellow("No signals found matching your filters."));
        return;
      }

      console.log();
      console.log(
        pc.bold(`  📡 Live Trading Signals`) +
        pc.dim(`  (${data.count}/${data.total} shown · refreshed ${new Date(data.generatedAt).toLocaleTimeString()})`)
      );
      console.log(pc.dim("  " + "─".repeat(72)));
      console.log(pc.dim(`  ${"#".padStart(2)}  ${"PAIR".padEnd(10)} ${"DIR".padEnd(7)}  ${"CONFIDENCE".padEnd(20)} ${"CONF%".padEnd(5)}  ${"TF".padEnd(4)} ${"PRICE"}`));
      console.log(pc.dim("  " + "─".repeat(72)));
      data.signals.forEach((s, i) => console.log(formatSignal(s, i)));
      console.log(pc.dim("  " + "─".repeat(72)));
      console.log(pc.dim(`\n  🔗 Full dashboard: https://tradeclaw.win`));
      console.log(pc.dim(`  ⭐ GitHub: https://github.com/naimkatiman/tradeclaw`));
      console.log();
    } catch (err) {
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");
      console.error(pc.red("Failed to fetch signals: " + err.message));
      console.log(pc.dim("  Make sure tradeclaw.win is reachable."));
      process.exit(1);
    }
  }

  async cmdLeaderboard(opts) {
    const period = opts.period || "30d";
    const spinner = this._spinner("Loading leaderboard...");
    try {
      const data = await fetchJson(`/leaderboard?period=${period}`);
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");

      if (!data.ok) throw new Error(data.error || "API error");

      const s = data.summary;
      console.log();
      console.log(pc.bold(`  🏆 Signal Accuracy Leaderboard`) + pc.dim(` (${period})`));
      console.log(pc.dim(`  Overall: ${s.totalSignals} signals · ${s.overallHitRate24h}% hit rate · Top: ${pc.green(s.topPerformer)}`));
      console.log(pc.dim("  " + "─".repeat(62)));
      console.log(pc.dim(`  ${"RK".padStart(2)}  ${"PAIR".padEnd(10)} ${"SIGNALS".padEnd(9)} ${"HIT 4H".padEnd(10)} ${"HIT 24H".padEnd(10)} ${"CONF%"}`));
      console.log(pc.dim("  " + "─".repeat(62)));

      (data.leaderboard || []).forEach((e, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
        const rank = pc.dim(String(i + 1).padStart(2));
        const pair = pc.bold(pc.white(String(e.pair).padEnd(10)));
        const total = pc.dim(String(e.totalSignals).padEnd(9));
        const hr4 = pc.cyan(`${e.hitRate4h}%`.padEnd(10));
        const hr24 = (e.hitRate24h >= 60 ? pc.green : e.hitRate24h >= 45 ? pc.yellow : pc.red)(`${e.hitRate24h}%`.padEnd(10));
        const conf = pc.dim(`${e.avgConfidence}%`);
        console.log(`  ${medal}${rank}  ${pair} ${total} ${hr4} ${hr24} ${conf}`);
      });

      console.log(pc.dim("  " + "─".repeat(62)));
      console.log(pc.dim(`\n  🔗 Full leaderboard: https://tradeclaw.win/leaderboard\n`));
    } catch (err) {
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");
      console.error(pc.red("Failed to fetch leaderboard: " + err.message));
      process.exit(1);
    }
  }

  async cmdHealth() {
    const spinner = this._spinner("Checking API health...");
    try {
      const data = await fetchJson("/health");
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");

      const statusIcon = data.status === "healthy" ? pc.green("✓") : pc.red("✗");
      console.log();
      console.log(`  ${statusIcon} TradeClaw API ${pc.bold(data.status)}`);
      console.log(`  ${pc.dim("Version:")}  ${data.version}`);
      console.log(`  ${pc.dim("Uptime:")}   ${data.uptime}s`);
      console.log(`  ${pc.dim("Time:")}     ${data.timestamp}`);
      console.log(`  ${pc.dim("Repo:")}     ${data.repository}`);
      console.log();
    } catch (err) {
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");
      console.error(pc.red("API unreachable: " + err.message));
      process.exit(1);
    }
  }

  async cmdBadge(pair) {
    if (!pair) {
      console.error(pc.red("Usage: tradeclaw badge <PAIR>"));
      console.log(pc.dim("  Example: tradeclaw badge BTCUSD"));
      process.exit(1);
    }
    const spinner = this._spinner(`Fetching badge for ${pair.toUpperCase()}...`);
    try {
      const data = await fetchJson(`/badge/${pair.toUpperCase()}`);
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");

      const isBuy = data.message?.includes("BUY");
      const msgColor = isBuy ? pc.green : pc.red;

      console.log();
      console.log(`  ${pc.dim("Label:")}   ${pc.bold(data.label)}`);
      console.log(`  ${pc.dim("Signal:")}  ${msgColor(pc.bold(data.message))}`);
      console.log(`  ${pc.dim("Color:")}   ${data.color}`);
      console.log();
      console.log(`  ${pc.dim("Badge URL (shields.io):")}`);
      console.log(`  ${pc.cyan(`https://img.shields.io/endpoint?url=https://tradeclaw.win/api/v1/badge/${pair.toUpperCase()}&style=flat-square`)}`);
      console.log();
      console.log(`  ${pc.dim("Markdown:")}`);
      console.log(`  ${pc.dim(`[![${pair.toUpperCase()} Signal](https://img.shields.io/endpoint?url=https://tradeclaw.win/api/v1/badge/${pair.toUpperCase()}&style=flat-square)](https://tradeclaw.win)`)}`);
      console.log();
    } catch (err) {
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");
      console.error(pc.red("Failed: " + err.message));
      process.exit(1);
    }
  }

  _spinner(msg) {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    return setInterval(() => {
      process.stdout.write(`\r  ${pc.cyan(frames[i++ % frames.length])} ${pc.dim(msg)}`);
    }, 80);
  }
}

module.exports = { TradeclawCLI };
