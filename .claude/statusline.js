#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

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
  dim: (str) => `${colors.dim}${str}${colors.reset}`,
  bold: (str) => `${colors.bold}${str}${colors.reset}`,
};

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  /** @type {StatusLineInput} */
  const data = JSON.parse(input);
  const currentDir = data.workspace.current_dir;

  // Worktree: Claude worktree sessions report `worktree`, any linked git worktree reports `workspace.git_worktree`
  const worktreeName = data.worktree?.name ?? data.workspace.git_worktree;
  const displayDir = data.worktree?.original_cwd ?? currentDir;

  // Cost and duration data
  const cost = data.cost || {};
  const totalCost = cost.total_cost_usd || 0;
  const totalDuration = cost.total_duration_ms || 0;
  const apiDuration = cost.total_api_duration_ms || 0;

  // Context window data (used_percentage is null before the first API response)
  const cw = data.context_window;

  const parts = [];

  // 1. CURRENT_DIR [⎇ WORKTREE] [on CURRENT_BRANCH]
  // Claude Code only reports the branch in worktree sessions, otherwise read it from git
  const branch = data.worktree?.branch || gitBranch(currentDir);
  const worktreeDisplay = worktreeName
    ? ` ${c.gray('⎇')} ${c.brightMagenta(worktreeName)}`
    : '';
  const branchDisplay = branch ? ` ${c.gray('on')} ${c.magenta(branch)}` : '';
  parts.push(
    `${c.brightBlue(tildify(displayDir))}${worktreeDisplay}${branchDisplay}`,
  );

  // 2. [AGENT · ]MODEL_NAME (EFFORT) [⚡] (Anthropic orange, ⚡ in fast mode)
  const model = data.model.display_name ?? data.model.id ?? 'Unknown';
  const effort = data.effort?.level ? ` (${data.effort.level})` : '';
  const agent = data.agent?.name
    ? `${c.brightCyan(data.agent.name)} ${c.gray('·')} `
    : '';
  const fast = data.fast_mode ? ` ${c.brightYellow('⚡')}` : '';
  parts.push(`${agent}${c.anthropicOrange(`${model}${effort}`)}${fast}`);

  // 3. TOTAL_COST (green)
  parts.push(c.green(fmtCost(totalCost)));

  // 4. CONTEXT_USED/CONTEXT_SIZE (used colored by percentage), links to the transcript
  // In fullscreen mode Claude Code handles the click and opens the file manager with the file selected
  const context = `${usageColor(cw.used_percentage ?? 0)(fmt(cw.total_input_tokens))}${c.gray('/')}${fmt(cw.context_window_size)}`;
  parts.push(
    data.transcript_path
      ? link(pathToFileURL(data.transcript_path).href, context)
      : context,
  );

  // 5. API_DURATION/TOTAL_DURATION (API dimmed)
  parts.push(
    `${c.dim(fmtDuration(apiDuration))}${c.gray('/')}${fmtDuration(totalDuration)}`,
  );

  // 6. PROMPT_CACHE: cache warm (EXPIRES_AT), or cache cold (RECACHE_TOKENS) (after the first API response)
  // Claude Code re-runs the status line at expires_at, so warm flips to cold on time
  const pc = data.prompt_cache;
  if (pc?.warm) {
    parts.push(
      `${c.gray('cache')} ${c.brightGreen('warm')} ${c.gray('(')}${fmtClock(pc.expires_at)}${c.gray(')')}`,
    );
  } else if (pc) {
    // recache_tokens_if_cold is null right after a compaction
    const recache =
      pc.recache_tokens_if_cold != null
        ? ` ${c.gray('(')}${fmt(pc.recache_tokens_if_cold)}${c.gray(')')}`
        : '';
    parts.push(`${c.gray('cache')} ${c.yellow('cold')}${recache}`);
  }

  // 7. RATE_LIMITS: 5H%/7D% (only for Pro/Max, after the first API response)
  const fiveHour = data.rate_limits?.five_hour;
  const sevenDay = data.rate_limits?.seven_day;
  if (fiveHour || sevenDay) {
    parts.push(`${fmtLimit(fiveHour)}${c.gray('/')}${fmtLimit(sevenDay)}`);
  }

  // Output the complete status line
  console.log(parts.join(` ${c.gray('|')} `));
});

const usageColor = (pct) => {
  if (pct >= 90) return c.red;
  if (pct >= 75) return c.yellow;
  if (pct >= 50) return c.brightYellow;
  return c.cyan;
};

// Replace /home/ahmedisam99 with ~ unless we're exactly in the home directory
const tildify = (dir) =>
  dir.startsWith(homeDir + '/') ? '~' + dir.slice(homeDir.length) : dir;

// OSC 8 hyperlink (tmux needs the `hyperlinks` terminal feature)
const link = (url, text) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

// Epoch seconds -> 02:32 PM (same format as the tmux clock)
const fmtClock = (epoch) =>
  new Date(epoch * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

const fmt = (n) => {
  if (n >= 1000000) return `${+(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const fmtLimit = (window) => {
  if (!window) return c.gray('-');
  const pct = Math.round(window.used_percentage);
  return usageColor(pct)(`${pct}%`);
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

// Find the git dir for `dir`, walking up to the repo root. In a linked
// worktree `.git` is a file pointing at the real git dir.
const findGitDir = (dir) => {
  for (let d = dir; ; d = path.dirname(d)) {
    const dotGit = path.join(d, '.git');
    try {
      if (fs.statSync(dotGit).isDirectory()) return dotGit;
      const match = fs.readFileSync(dotGit, 'utf8').match(/^gitdir: (.+)$/m);
      if (match) return path.resolve(d, match[1].trim());
    } catch (e) {
      // No .git here, keep walking up
    }
    if (d === path.dirname(d)) return null;
  }
};

const gitBranch = (dir) => {
  try {
    const gitDir = findGitDir(dir);
    if (!gitDir) return '';
    const headContent = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (headContent.startsWith('ref: refs/heads/')) {
      return headContent.replace('ref: refs/heads/', '');
    }
    // Detached HEAD: HEAD holds a raw commit hash (SHA-1 or SHA-256)
    if (/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(headContent)) {
      return `(${headContent.slice(0, 7)})`;
    }
  } catch (e) {
    // Can't read HEAD
  }
  return '';
};

/**
 * Source: https://code.claude.com/docs/en/statusline#available-data (fetched 2026-10-19)
 * Verified against Claude Code 2.1.303
 *
 * @typedef {Object} StatusLineInput
 * @property {string} cwd Same value as workspace.current_dir
 * @property {string} session_id
 * @property {string} [session_name] Name from --name or /rename, else the AI-generated title
 * @property {string} [prompt_id] UUID of the prompt being processed; absent until the first user input
 * @property {string} transcript_path
 * @property {string} version Claude Code version
 * @property {{id: string, display_name: string}} model
 * @property {Workspace} workspace
 * @property {{name: string}} output_style
 * @property {Cost} cost
 * @property {ContextWindow} context_window
 * @property {boolean} exceeds_200k_tokens Fixed 200k threshold on the last response's total tokens, regardless of window size
 * @property {PromptCache} [prompt_cache] Absent until the main conversation's first API response
 * @property {boolean} fast_mode
 * @property {{level: 'low'|'medium'|'high'|'xhigh'|'max'}} [effort] Absent when the model doesn't support effort
 * @property {{enabled: boolean}} thinking
 * @property {RateLimits} [rate_limits] Pro/Max or spend-limit gateway only, after the first API response
 * @property {{mode: 'NORMAL'|'INSERT'|'VISUAL'|'VISUAL LINE'}} [vim] Only when vim mode is enabled
 * @property {{name: string}} [agent] Only with --agent or agent settings
 * @property {PullRequest} [pr] Only while the branch has an open PR or GitLab MR
 * @property {Worktree} [worktree] Only during a Claude Code worktree session
 */

/**
 * @typedef {Object} Workspace
 * @property {string} current_dir
 * @property {string} project_dir Directory Claude Code was launched from
 * @property {string[]} added_dirs From /add-dir or --add-dir
 * @property {string} [git_worktree] Worktree name when inside any linked git worktree
 * @property {{host: string, owner: string, name: string}} [repo] Parsed from the `origin` remote
 */

/**
 * @typedef {Object} Cost
 * @property {number} total_cost_usd Client-side estimate at list price; resets on /clear
 * @property {number} total_duration_ms Wall-clock session time, accumulated across resumes
 * @property {number} total_api_duration_ms
 * @property {number} total_lines_added
 * @property {number} total_lines_removed
 */

/**
 * @typedef {Object} ContextWindow
 * @property {number} total_input_tokens Tokens in the context now: input + cache creation + cache read
 * @property {number} total_output_tokens Output tokens of the most recent response
 * @property {number} context_window_size 200000, or 1000000 for extended context
 * @property {number|null} used_percentage Input tokens only; null early in the session
 * @property {number|null} remaining_percentage
 * @property {CurrentUsage|null} current_usage Null before the first API call and right after /compact
 */

/**
 * @typedef {Object} CurrentUsage
 * @property {number} input_tokens
 * @property {number} output_tokens
 * @property {number} cache_creation_input_tokens
 * @property {number} cache_read_input_tokens
 */

/**
 * Main conversation only; subagent requests aren't counted. Timestamps are epoch seconds.
 * @typedef {Object} PromptCache
 * @property {boolean} warm Cached prefix is still within its TTL
 * @property {boolean} caching_observed Any response this session reported cache tokens
 * @property {'5m'|'1h'} ttl
 * @property {number|null} expires_at
 * @property {number} requests
 * @property {number} misses
 * @property {number} expected_rebuilds Rebuilds after compaction or tool-result clearing
 * @property {number|null} hit_ratio Cache reads / all input tokens, 0 to 1
 * @property {number} cache_write_tokens
 * @property {number} miss_recache_tokens
 * @property {number|null} last_miss_at
 * @property {MissCause|null} last_miss_cause
 * @property {Object<string, number>} miss_causes Count per cause name
 * @property {number|null} recache_tokens_if_cold Tokens the next request re-caches if the cache went cold
 */

/**
 * @typedef {Object} MissCause
 * @property {string[]} causes e.g. tools_changed, system_prompt_changed, ttl_expired_5m, likely_server_side
 * @property {number} [tools_added] With tools_changed
 * @property {number} [tools_removed] With tools_changed
 * @property {number} [system_char_delta] With system_prompt_changed
 */

/**
 * Each window can be absent, and is dropped once its resets_at passes.
 * @typedef {Object} RateLimits
 * @property {RateLimitWindow} [five_hour]
 * @property {RateLimitWindow} [seven_day]
 * @property {SpendLimit} [spend_limit] Claude apps gateway only
 */

/**
 * @typedef {Object} RateLimitWindow
 * @property {number} used_percentage 0 to 100
 * @property {number} resets_at Epoch seconds
 */

/**
 * @typedef {Object} SpendLimit
 * @property {number} used_percentage Can exceed 100
 * @property {number} resets_at Epoch seconds
 * @property {number} [used_usd] Fetched about every 5 minutes, so can lag used_percentage
 * @property {number} [limit_usd]
 * @property {'daily'|'weekly'|'monthly'} [period]
 */

/**
 * @typedef {Object} PullRequest
 * @property {number} number PR number, or MR number for GitLab
 * @property {string} url
 * @property {'approved'|'pending'|'changes_requested'|'draft'} [review_state]
 * @property {'mr'} [kind] Set for GitLab merge requests, absent for GitHub PRs
 */

/**
 * @typedef {Object} Worktree
 * @property {string} name
 * @property {string} path
 * @property {string} [branch] Absent for hook-based worktrees
 * @property {string} original_cwd Directory before entering the worktree
 * @property {string} [original_branch] Absent for hook-based worktrees
 */
