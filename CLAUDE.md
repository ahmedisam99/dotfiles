# dotfiles

The repo root is a single GNU Stow package: `stow .` from here symlinks every file into the same path under `~` (`.zshrc` → `~/.zshrc`, `.claude/statusline.js` → `~/.claude/statusline.js`).

- Files that belong to the repo only (like this one) must be listed in `.stow-local-ignore`, or stow links them into `~`.
- `.stow-local-ignore` replaces stow's built-in ignore list, so it repeats those defaults. Keep them when editing it.
- `.claude/` here becomes `~/.claude/`, so anything added there is user-level Claude Code config. This repo's own project settings (`.claude/settings.json`) are stow-ignored for that reason.
- On a new machine, stow with `stow --no-folding .`. When a folder like `~/.claude` doesn't exist yet, plain `stow .` links the whole folder to the repo instead of its files, which bypasses the ignore list for files inside it and makes Claude Code write its sessions into the repo.