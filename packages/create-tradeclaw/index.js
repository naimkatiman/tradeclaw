#!/usr/bin/env node

'use strict';

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// ── Colors (zero-dep) ───────────────────────────────────────────────
const fmt = {
  bold:  (s) => `\x1b[1m${s}\x1b[22m`,
  dim:   (s) => `\x1b[2m${s}\x1b[22m`,
  green: (s) => `\x1b[32m${s}\x1b[39m`,
  red:   (s) => `\x1b[31m${s}\x1b[39m`,
  cyan:  (s) => `\x1b[36m${s}\x1b[39m`,
  yellow:(s) => `\x1b[33m${s}\x1b[39m`,
};

const REPO = 'https://github.com/naimkatiman/tradeclaw.git';
const VERSION = '1.0.0';

// ── Helpers ─────────────────────────────────────────────────────────
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

function hasCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function step(msg) {
  process.stdout.write(`\n  ${fmt.green('>')} ${msg}\n`);
}

function warn(msg) {
  process.stdout.write(`  ${fmt.yellow('!')} ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`\n  ${fmt.red('x')} ${msg}\n\n`);
  process.exit(1);
}

// ── Parse args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
let projectDir = null;
let useDocker = null;
let skipInstall = false;
let showHelp = false;
let branch = 'main';

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--help' || a === '-h') showHelp = true;
  else if (a === '--docker') useDocker = true;
  else if (a === '--no-docker') useDocker = false;
  else if (a === '--skip-install') skipInstall = true;
  else if (a === '--branch' && args[i + 1]) branch = args[++i];
  else if (!a.startsWith('-') && !projectDir) projectDir = a;
}

if (showHelp) {
  console.log(`
  ${fmt.bold('create-tradeclaw')} ${fmt.dim(`v${VERSION}`)}

  Set up a self-hosted TradeClaw AI trading signal platform.

  ${fmt.bold('Usage:')}
    npx create-tradeclaw ${fmt.dim('[project-directory]')} ${fmt.dim('[options]')}

  ${fmt.bold('Options:')}
    --docker          Use Docker Compose (auto-detected if available)
    --no-docker       Use npm install instead of Docker
    --skip-install    Clone only, skip dependency installation
    --branch <name>   Git branch to clone (default: main)
    -h, --help        Show this help

  ${fmt.bold('Examples:')}
    npx create-tradeclaw my-trading-bot
    npx create-tradeclaw my-bot --docker
    npx create-tradeclaw . --no-docker

  ${fmt.dim('GitHub:  https://github.com/naimkatiman/tradeclaw')}
  ${fmt.dim('Docs:    https://tradeclaw.win')}
`);
  process.exit(0);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  // Banner
  console.log('');
  console.log(fmt.green('  ████████╗██████╗  █████╗ ██████╗ ███████╗ ██████╗██╗      █████╗ ██╗    ██╗'));
  console.log(fmt.green('     ██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██║    ██║'));
  console.log(fmt.green('     ██║   ██████╔╝███████║██║  ██║█████╗  ██║     ██║     ███████║██║ █╗ ██║'));
  console.log(fmt.green('     ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ██║     ██║     ██╔══██║██║███╗██║'));
  console.log(fmt.green('     ██║   ██║  ██║██║  ██║██████╔╝███████╗╚██████╗███████╗██║  ██║╚███╔███╔╝'));
  console.log(fmt.green('     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ '));
  console.log('');
  console.log(fmt.bold('  Create TradeClaw') + fmt.dim(` v${VERSION}`));
  console.log(fmt.dim('  Open-source AI trading signal platform'));
  console.log('');

  // 1. Check git
  if (!hasCommand('git')) {
    fail('git is required. Install it from https://git-scm.com');
  }

  // 2. Project directory
  if (!projectDir) {
    projectDir = await ask(`  ${fmt.bold('Project name:')} ${fmt.dim('(tradeclaw)')} `);
    if (!projectDir) projectDir = 'tradeclaw';
  }

  const targetPath = path.resolve(process.cwd(), projectDir);
  const targetName = path.basename(targetPath);

  // Check if directory already has content
  if (fs.existsSync(targetPath)) {
    const contents = fs.readdirSync(targetPath);
    if (contents.length > 0 && contents.some((f) => f !== '.git')) {
      fail(`Directory "${targetName}" already exists and is not empty.`);
    }
  }

  // 3. Detect Docker
  const hasDocker = hasCommand('docker');
  const hasDockerCompose = hasDocker && (() => {
    try { execSync('docker compose version', { stdio: 'ignore' }); return true; }
    catch { return false; }
  })();

  if (useDocker === null) {
    if (hasDockerCompose) {
      const answer = await ask(`  ${fmt.bold('Use Docker Compose?')} ${fmt.dim('(recommended)')} [Y/n] `);
      useDocker = answer.toLowerCase() !== 'n';
    } else {
      useDocker = false;
      if (!hasDocker) {
        warn('Docker not found. Using npm install instead.');
      }
    }
  }

  if (useDocker && !hasDockerCompose) {
    fail('Docker Compose is required for --docker. Install Docker Desktop: https://docs.docker.com/get-docker/');
  }

  // 4. Clone
  step(`Cloning TradeClaw into ${fmt.cyan(targetName)}...`);
  try {
    execSync(`git clone --depth 1 --branch ${branch} ${REPO} "${targetPath}"`, {
      stdio: 'pipe',
    });
  } catch (err) {
    fail(`Failed to clone repository: ${err.message}`);
  }

  // Remove .git to start fresh
  const gitDir = path.join(targetPath, '.git');
  fs.rmSync(gitDir, { recursive: true, force: true });

  // Re-init git
  execSync('git init', { cwd: targetPath, stdio: 'ignore' });

  // 5. Generate .env
  step('Generating .env with secure defaults...');
  const envExample = path.join(targetPath, '.env.example');
  const envFile = path.join(targetPath, '.env');

  if (fs.existsSync(envExample)) {
    let envContent = fs.readFileSync(envExample, 'utf-8');

    // Auto-generate secrets
    const dbPassword = crypto.randomBytes(16).toString('hex');
    const authSecret = crypto.randomBytes(32).toString('hex');

    envContent = envContent.replace(
      /^DB_PASSWORD=\s*$/m,
      `DB_PASSWORD=${dbPassword}`
    );
    envContent = envContent.replace(
      /^AUTH_SECRET=\s*$/m,
      `AUTH_SECRET=${authSecret}`
    );

    fs.writeFileSync(envFile, envContent);
    console.log(fmt.dim('    DB_PASSWORD and AUTH_SECRET auto-generated'));
  }

  // 6. Install
  if (!skipInstall) {
    if (useDocker) {
      step('Starting services with Docker Compose...');
      console.log(fmt.dim('    This may take a few minutes on first run.\n'));

      const docker = spawn('docker', ['compose', 'up', '-d', '--build'], {
        cwd: targetPath,
        stdio: 'inherit',
      });

      await new Promise((resolve, reject) => {
        docker.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Docker Compose exited with code ${code}`));
        });
      });
    } else {
      // Check node version
      const [major] = process.versions.node.split('.').map(Number);
      if (major < 18) {
        fail(`Node.js 18+ required. Current: ${process.version}`);
      }

      step('Installing dependencies...');
      try {
        execSync('npm install', {
          cwd: targetPath,
          stdio: 'inherit',
        });
      } catch {
        warn('npm install failed. You can retry manually inside the project.');
      }

      step('Building packages...');
      try {
        execSync('npm run build', {
          cwd: targetPath,
          stdio: 'inherit',
          timeout: 120000,
        });
      } catch {
        warn('Build had issues. Run `npm run build` manually to debug.');
      }
    }
  }

  // 7. Initial commit
  try {
    execSync('git add -A && git commit -m "Initial TradeClaw setup via create-tradeclaw"', {
      cwd: targetPath,
      stdio: 'ignore',
    });
  } catch {
    // Not critical if this fails
  }

  // 8. Success
  console.log('');
  console.log(fmt.green('  ─────────────────────────────────────────────────────'));
  console.log(fmt.green(fmt.bold('  ✓ TradeClaw is ready!')));
  console.log(fmt.green('  ─────────────────────────────────────────────────────'));
  console.log('');
  console.log(fmt.bold('  Next steps:'));
  console.log('');
  console.log(`    ${fmt.cyan('cd ' + targetName)}`);

  if (useDocker) {
    console.log(`    ${fmt.dim('# Services are already running via Docker Compose')}`);
    console.log(`    ${fmt.cyan('docker compose logs -f')}`);
    console.log('');
    console.log(`  ${fmt.bold('  Dashboard:')}  ${fmt.cyan('http://localhost:3000')}`);
    console.log(`  ${fmt.bold('  Signals:  ')}  ${fmt.cyan('http://localhost:3000/api/signals')}`);
    console.log(`  ${fmt.bold('  Health:   ')}  ${fmt.cyan('http://localhost:3000/api/health')}`);
  } else if (!skipInstall) {
    console.log(`    ${fmt.cyan('npm run dev')}`);
    console.log('');
    console.log(`  ${fmt.bold('  Dashboard:')}  ${fmt.cyan('http://localhost:3000')}`);
  } else {
    console.log(`    ${fmt.cyan('npm install')}`);
    console.log(`    ${fmt.cyan('npm run dev')}`);
  }

  console.log('');
  console.log(fmt.dim('  Useful commands:'));
  console.log(`    ${fmt.dim('npm run dev')}            ${fmt.dim('Start development server')}`);
  console.log(`    ${fmt.dim('npm run build')}          ${fmt.dim('Production build')}`);
  console.log(`    ${fmt.dim('npm run agent:scan')}     ${fmt.dim('Run signal scanner')}`);
  console.log(`    ${fmt.dim('docker compose up -d')}   ${fmt.dim('Start all services')}`);
  console.log('');
  console.log(`  ${fmt.dim('Docs:    https://tradeclaw.win')}`);
  console.log(`  ${fmt.dim('GitHub:  https://github.com/naimkatiman/tradeclaw')}`);
  console.log('');
  console.log(fmt.green(`  ⭐ Star us: https://github.com/naimkatiman/tradeclaw`));
  console.log('');
}

main().catch((err) => {
  fail(err.message || String(err));
});
