#!/usr/bin/env node

const pc = require('picocolors');
const { startServer } = require('../lib/server');

// Check Node version
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(pc.red('✗ TradeClaw requires Node.js v18 or higher.'));
  console.error(pc.dim('  Current version: ' + process.version));
  console.error(pc.dim('  Upgrade: https://nodejs.org'));
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const opts = {
  port: null,
  noOpen: false,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--help' || a === '-h') { opts.help = true; }
  else if (a === '--no-open') { opts.noOpen = true; }
  else if ((a === '--port' || a === '-p') && args[i + 1]) {
    const p = parseInt(args[++i], 10);
    if (isNaN(p) || p < 1024 || p > 65535) {
      console.error(pc.red('✗ Invalid port: ' + args[i]));
      process.exit(1);
    }
    opts.port = p;
  } else if (a.startsWith('--port=')) {
    const p = parseInt(a.slice(7), 10);
    if (isNaN(p) || p < 1024 || p > 65535) {
      console.error(pc.red('✗ Invalid port: ' + a));
      process.exit(1);
    }
    opts.port = p;
  }
}

if (opts.help) {
  console.log('');
  console.log(pc.bold('  npx tradeclaw-demo') + pc.dim(' [options]'));
  console.log('');
  console.log('  Starts a local UI fixture with synthetic, non-market signal values.');
  console.log('');
  console.log(pc.bold('  Options:'));
  console.log('    --port, -p <n>    Port to listen on (default: auto-detect 3000-3002)');
  console.log('    --no-open         Do not auto-open browser');
  console.log('    --help, -h        Show this help');
  console.log('');
  console.log(pc.bold('  Examples:'));
  console.log('    npx tradeclaw-demo');
  console.log('    npx tradeclaw-demo --port 4000');
  console.log('    npx tradeclaw-demo --no-open');
  console.log('');
  console.log(pc.dim('  GitHub: https://github.com/naimkatiman/tradeclaw'));
  console.log(pc.dim('  Site:   https://tradeclaw.win'));
  console.log('');
  process.exit(0);
}

// Banner
console.log('');
console.log(pc.green('  ████████╗██████╗  █████╗ ██████╗ ███████╗'));
console.log(pc.green('     ██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝'));
console.log(pc.green('     ██║   ██████╔╝███████║██║  ██║█████╗  '));
console.log(pc.green('     ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  '));
console.log(pc.green('     ██║   ██║  ██║██║  ██║██████╔╝███████╗'));
console.log(pc.green('     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝'));
console.log('');
console.log(pc.bold(pc.white('  TradeClaw — Illustrative UI Fixture')));
console.log(pc.dim('  Synthetic values • No market feed • No execution or performance data'));
console.log('');

startServer(opts);
