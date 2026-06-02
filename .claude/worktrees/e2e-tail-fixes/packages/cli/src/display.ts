import chalk from "chalk";
import type { BacktestResult, Signal } from "./api.js";

const DIRECTION_COLORS: Record<string, (text: string) => string> = {
  BUY: chalk.green,
  SELL: chalk.red,
  HOLD: chalk.yellow,
};

function colorDirection(direction: string): string {
  const colorFn = DIRECTION_COLORS[direction] ?? chalk.white;
  return colorFn(direction);
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : " ".repeat(len - str.length) + str;
}

export function displaySignals(signals: Signal[], json: boolean): void {
  if (json) {
    console.log(JSON.stringify(signals, null, 2));
    return;
  }

  if (signals.length === 0) {
    console.log(chalk.dim("No signals found."));
    return;
  }

  // Header
  const header = [
    padRight("Symbol", 12),
    padRight("Direction", 10),
    padLeft("Confidence", 12),
    padLeft("Price", 14),
    padRight("Time", 22),
  ].join("  ");

  console.log(chalk.bold.underline(header));

  // Rows
  for (const signal of signals) {
    const row = [
      padRight(signal.symbol, 12),
      padRight(colorDirection(signal.direction), 10 + (colorDirection(signal.direction).length - signal.direction.length)),
      padLeft(`${(signal.confidence * 100).toFixed(1)}%`, 12),
      padLeft(signal.price.toFixed(4), 14),
      padRight(new Date(signal.timestamp).toLocaleString(), 22),
    ].join("  ");
    console.log(row);
  }

  console.log(chalk.dim(`\n${signals.length} signal(s) total`));
}

export function displayBacktest(result: BacktestResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold(`\nBacktest: ${result.symbol} (${result.days} days)\n`));
  console.log(`  Total Trades:  ${chalk.cyan(String(result.totalTrades))}`);

  const winColor = result.winRate >= 0.5 ? chalk.green : chalk.red;
  console.log(`  Win Rate:      ${winColor((result.winRate * 100).toFixed(1) + "%")}`);

  const plColor = result.profitLoss >= 0 ? chalk.green : chalk.red;
  console.log(`  Profit/Loss:   ${plColor(result.profitLoss.toFixed(2))}`);

  console.log(`  Sharpe Ratio:  ${chalk.cyan(result.sharpeRatio.toFixed(2))}`);
  console.log(`  Max Drawdown:  ${chalk.red(result.maxDrawdown.toFixed(2) + "%")}`);
  console.log();
}
