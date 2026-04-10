#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const homeDir = '/home/ahmedisam99';
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  brightCyan: '\x1b[96m',
  brightBlue: '\x1b[94m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightMagenta: '\x1b[95m',

  anthropicOrange: '\x1b[38;2;217;119;6m', // #D97706
  cavemanBadge: '\x1b[38;2;168;162;158m', // #A8A29E
};

const c = {
  red: (str) => `${colors.red}${str}${colors.reset}`,
  green: (str) => `${colors.green}${str}${colors.reset}`,
  blue: (str) => `${colors.blue}${str}${colors.reset}`,
  cyan: (str) => `${colors.cyan}${str}${colors.reset}`,
  yellow: (str) => `${colors.yellow}${str}${colors.reset}`,
  magenta: (str) => `${colors.magenta}${str}${colors.reset}`,
  gray: (str) => `${colors.gray}${str}${colors.reset}`,
  white: (str) => `${colors.white}${str}${colors.reset}`,
  brightBlue: (str) => `${colors.brightBlue}${str}${colors.reset}`,
  brightCyan: (str) => `${colors.brightCyan}${str}${colors.reset}`,
  brightGreen: (str) => `${colors.brightGreen}${str}${colors.reset}`,
  brightYellow: (str) => `${colors.brightYellow}${str}${colors.reset}`,
  brightMagenta: (str) => `${colors.brightMagenta}${str}${colors.reset}`,
  anthropicOrange: (str) => `${colors.anthropicOrange}${str}${colors.reset}`,
  cavemanBadge: (str) => `${colors.cavemanBadge}${str}${colors.reset}`,
  dim: (str) => `${colors.dim}${str}${colors.reset}`,
  bold: (str) => `${colors.bold}${str}${colors.reset}`,
};

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const data = JSON.parse(input);
  let currentDir = data.workspace.current_dir;

  // Replace /home/ahmedisam99 with ~ unless we're exactly in the home directory
  if (currentDir !== homeDir && currentDir.startsWith(homeDir + '/')) {
    currentDir = '~' + currentDir.slice(homeDir.length);
  } else if (currentDir === homeDir) {
    currentDir = homeDir;
  }

  // Cost and duration data
  const cost = data.cost || {};
  const totalCost = cost.total_cost_usd || 0;
  const totalDuration = cost.total_duration_ms || 0;
  const apiDuration = cost.total_api_duration_ms || 0;
  const linesAdded = cost.total_lines_added || 0;
  const linesRemoved = cost.total_lines_removed || 0;

  // Context window data
  const cw = data.context_window;
  const totalIn = cw.total_input_tokens || 0;
  const totalOut = cw.total_output_tokens || 0;
  const contextSize = cw.context_window_size || 200000;

  // Current usage (from last API call)
  let currentIn = null;
  let currentOut = null;
  let usedContext = 0;
  let contextPct = 0;

  if (cw.current_usage) {
    currentIn = cw.current_usage.input_tokens || 0;
    currentOut = cw.current_usage.output_tokens || 0;

    usedContext =
      currentIn +
      (cw.current_usage.cache_creation_input_tokens || 0) +
      (cw.current_usage.cache_read_input_tokens || 0);

    contextPct = Math.round((usedContext / contextSize) * 100);
  }

  const parts = [];

  // 1. CURRENT_DIR [on CURRENT_BRANCH]
  const branch = gitBranch(data.workspace.project_dir);
  const branchDisplay = branch ? ` ${c.gray('on')} ${c.magenta(branch)}` : '';
  parts.push(`${c.brightBlue(currentDir)}${branchDisplay}`);

  // 2. MODEL_NAME (Anthropic orange)
  const model = data.model.display_name ?? data.model.id ?? 'Unknown';
  parts.push(c.anthropicOrange(model));

  // 3. TOTAL_COST (green)
  parts.push(c.green(fmtCost(totalCost)));

  // 4. TOTAL_IN_AND_OUT (session totals - no colors)
  parts.push(`${fmt(totalIn)}↓ ${fmt(totalOut)}↑`);

  // 5. TOTAL_DURATION (API: API_DURATION)
  parts.push(
    `${fmtDuration(totalDuration)} ${c.dim(`(API: ${fmtDuration(apiDuration)})`)}`,
  );

  // 6. LINES_ADDED_AND_REMOVED
  parts.push(`${c.green(`+${linesAdded}`)} ${c.red(`-${linesRemoved}`)}`);

  // 7. CONTEXT_USAGE and CONTEXT_PERCENTAGE
  const contextColorFn = getContextColor(contextPct);
  parts.push(
    `${fmt(usedContext)}${c.gray('/')}${fmt(contextSize)} ${c.gray('(')}${contextColorFn(`${contextPct}%`)}${c.gray(')')}`,
  );

  // 8. CURRENT_IN_AND_OUT (only if available)
  if (currentIn !== null && currentOut !== null) {
    parts.push(c.gray(`${fmt(currentIn)}↓ ${fmt(currentOut)}↑`));
  }

  // 9. CAVEMAN_BADGE (only if active)
  const badge = cavemanBadge();
  if (badge) {
    parts.push(badge);
  }

  // Output the complete status line
  console.log(parts.join(` ${c.gray('|')} `));
});

const getContextColor = (pct) => {
  if (pct >= 90) return c.red;
  if (pct >= 75) return c.yellow;
  if (pct >= 50) return c.brightYellow;
  return c.cyan;
};

const fmt = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const fmtDuration = (ms) => {
  if (ms === 0) return '0s';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m${secs}s`;
};

const fmtCost = (usd) => {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
};

const gitBranch = (projectDir) => {
  try {
    const gitHeadPath = path.join(projectDir, '.git', 'HEAD');
    const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
    if (headContent.startsWith('ref: refs/heads/')) {
      return headContent.replace('ref: refs/heads/', '');
    }
  } catch (e) {
    // Not a git repo or can't read HEAD
  }
  return '';
};

const cavemanBadge = () => {
  try {
    const flagPath = path.join(homeDir, '.claude', '.caveman-active');
    if (!fs.existsSync(flagPath)) {
      return '';
    }

    const mode = fs.readFileSync(flagPath, 'utf8').trim();
    if (mode === '') {
      return c.cavemanBadge('[CAVEMAN]');
    }

    return c.cavemanBadge(`[CAVEMAN:${mode.toUpperCase()}]`);
  } catch (e) {
    return '';
  }
};
