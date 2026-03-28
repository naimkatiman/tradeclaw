#!/usr/bin/env node
'use strict';

const { createServer } = require('../lib/index');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Parse --base-url flag
const args = process.argv.slice(2);
let baseUrl = process.env.TRADECLAW_BASE_URL || 'https://tradeclaw.win';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--base-url' || args[i] === '-u') && args[i + 1]) {
    baseUrl = args[++i];
  } else if (args[i].startsWith('--base-url=')) {
    baseUrl = args[i].slice(11);
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.error('tradeclaw-mcp — Model Context Protocol server for TradeClaw AI trading signals');
    console.error('');
    console.error('Usage: npx tradeclaw-mcp [options]');
    console.error('');
    console.error('Options:');
    console.error('  --base-url, -u <url>   TradeClaw base URL (default: https://tradeclaw.win)');
    console.error('                         Override for self-hosted: --base-url http://localhost:3000');
    console.error('  --help, -h             Show this help');
    console.error('');
    console.error('Environment:');
    console.error('  TRADECLAW_BASE_URL     Base URL override (same as --base-url)');
    console.error('');
    console.error('Usage with Claude Desktop (add to claude_desktop_config.json):');
    console.error(JSON.stringify({
      mcpServers: {
        tradeclaw: {
          command: 'npx',
          args: ['tradeclaw-mcp'],
          env: { TRADECLAW_BASE_URL: 'https://tradeclaw.win' },
        },
      },
    }, null, 2));
    console.error('');
    console.error('GitHub: https://github.com/naimkatiman/tradeclaw');
    process.exit(0);
  }
}

async function main() {
  const server = await createServer(baseUrl);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers run until killed
}

main().catch((err) => {
  process.stderr.write('tradeclaw-mcp error: ' + err.message + '\n');
  process.exit(1);
});
