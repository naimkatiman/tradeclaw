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

// Banner
console.log('');
console.log(pc.green('  ████████╗██████╗  █████╗ ██████╗ ███████╗'));
console.log(pc.green('     ██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝'));
console.log(pc.green('     ██║   ██████╔╝███████║██║  ██║█████╗  '));
console.log(pc.green('     ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  '));
console.log(pc.green('     ██║   ██║  ██║██║  ██║██████╔╝███████╗'));
console.log(pc.green('     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝'));
console.log('');
console.log(pc.bold(pc.white('  ⚡ TradeClaw — AI Trading Signal Platform')));
console.log(pc.dim('  Open-source • Self-hostable • Real-time'));
console.log('');

startServer();
