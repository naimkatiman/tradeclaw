#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { fetchBacktest, fetchSignals } from "./api.js";
import { loadConfig, setConfigValue } from "./config.js";
import { displayBacktest, displaySignals } from "./display.js";

const program = new Command();

program
  .name("tradeclaw")
  .description("CLI tool for TradeClaw signal fetching")
  .version("0.1.0");

// ── signals command ──────────────────────────────────────────────────
program
  .command("signals")
  .description("Fetch and display trading signals")
  .option("-s, --symbol <symbol>", "Filter by symbol (e.g. BTCUSDT)")
  .option("-f, --filter <direction>", "Filter by direction (BUY, SELL, HOLD)")
  .option("-j, --json", "Output raw JSON", false)
  .action(async (opts: { symbol?: string; filter?: string; json: boolean }) => {
    try {
      const signals = await fetchSignals({
        symbol: opts.symbol,
        filter: opts.filter?.toUpperCase(),
      });
      displaySignals(signals, opts.json);
    } catch (err) {
      console.error(
        chalk.red("Error fetching signals:"),
        err instanceof Error ? err.message : String(err),
      );
      process.exit(1);
    }
  });

// ── backtest command ─────────────────────────────────────────────────
program
  .command("backtest")
  .description("Run a backtest for a given symbol")
  .requiredOption("-s, --symbol <symbol>", "Symbol to backtest (e.g. EURUSD)")
  .option("-d, --days <days>", "Number of days to backtest", "30")
  .option("-j, --json", "Output raw JSON", false)
  .action(async (opts: { symbol: string; days: string; json: boolean }) => {
    try {
      const result = await fetchBacktest({
        symbol: opts.symbol.toUpperCase(),
        days: parseInt(opts.days, 10),
      });
      displayBacktest(result, opts.json);
    } catch (err) {
      console.error(
        chalk.red("Error running backtest:"),
        err instanceof Error ? err.message : String(err),
      );
      process.exit(1);
    }
  });

// ── watch command ────────────────────────────────────────────────────
program
  .command("watch")
  .description("Poll signals for a symbol every 60 seconds")
  .requiredOption("-s, --symbol <symbol>", "Symbol to watch (e.g. BTCUSDT)")
  .option("-i, --interval <seconds>", "Polling interval in seconds", "60")
  .option("-j, --json", "Output raw JSON", false)
  .action(
    async (opts: { symbol: string; interval: string; json: boolean }) => {
      const intervalMs = parseInt(opts.interval, 10) * 1000;
      console.log(
        chalk.dim(
          `Watching ${opts.symbol.toUpperCase()} every ${opts.interval}s (Ctrl+C to stop)\n`,
        ),
      );

      const poll = async (): Promise<void> => {
        try {
          const signals = await fetchSignals({
            symbol: opts.symbol.toUpperCase(),
          });
          const timestamp = new Date().toLocaleTimeString();
          if (!opts.json) {
            console.log(chalk.dim(`--- ${timestamp} ---`));
          }
          displaySignals(signals, opts.json);
        } catch (err) {
          console.error(
            chalk.red("Error:"),
            err instanceof Error ? err.message : String(err),
          );
        }
      };

      await poll();
      setInterval(() => void poll(), intervalMs);
    },
  );

// ── config command ───────────────────────────────────────────────────
const configCmd = program
  .command("config")
  .description("Manage CLI configuration");

configCmd
  .command("set <key> <value>")
  .description("Set a config value (url or apikey)")
  .action((key: string, value: string) => {
    const validKeys = ["url", "apikey"] as const;
    if (!validKeys.includes(key as (typeof validKeys)[number])) {
      console.error(
        chalk.red(`Invalid config key: ${key}. Use: ${validKeys.join(", ")}`),
      );
      process.exit(1);
    }
    setConfigValue(key as "url" | "apikey", value);
    console.log(chalk.green(`Set ${key} = ${key === "apikey" ? "****" : value}`));
  });

configCmd
  .command("get")
  .description("Show current configuration")
  .action(() => {
    const config = loadConfig();
    console.log(chalk.bold("TradeClaw CLI Configuration\n"));
    console.log(`  url:    ${chalk.cyan(config.url)}`);
    console.log(
      `  apikey: ${config.apikey ? chalk.dim("****" + config.apikey.slice(-4)) : chalk.dim("(not set)")}`,
    );
    console.log();
  });

program.parse();
