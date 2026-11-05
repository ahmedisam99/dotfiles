# ASCII BOAT SHELL INTEGRATION START boat
case ":$PATH:" in
  *":/home/ahmedisam99/.ascii/bin:"*) ;;
  *) PATH="/home/ahmedisam99/.ascii/bin:$PATH" ;;
esac
export PATH
# ASCII BOAT SHELL INTEGRATION END boat

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# Set the directory we want to store zinit and plugins
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"

# Download Zinit, if it's not there yet
if [ ! -d "$ZINIT_HOME" ]; then
   mkdir -p "$(dirname $ZINIT_HOME)"
   git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
fi

# Source/Load zinit
source "${ZINIT_HOME}/zinit.zsh"

# Add in Powerlevel10k
zinit ice depth=1; zinit light romkatv/powerlevel10k

# Add zsh plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab

# Add in snippets
zinit snippet OMZP::command-not-found

# Load completions
autoload -Uz compinit && compinit

zinit cdreplay -q

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# Keybindings
bindkey -e
bindkey '^p' history-search-backward
bindkey '^n' history-search-forward

# History
HISTSIZE=5000
HISTFILE=~/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

# Completion styling
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza -a --group-directories-first --icons=auto --color=always $realpath'
zstyle ':fzf-tab:complete:__zoxide_z:*' fzf-preview 'eza -a --group-directories-first --icons=auto --color=always $realpath'

[[ ! -f ~/.ahmedsecrets ]] || source ~/.ahmedsecrets

# Aliases
alias vim='nvim'
alias ls='eza -lah --group-directories-first --icons=auto'
alias ff="fzf --preview 'bat --style=numbers --color=always {}'"
alias cc='ENABLE_CLAUDEAI_MCP_SERVERS=false claude --allow-dangerously-skip-permissions'

alias cpa='ANTHROPIC_BASE_URL=http://127.0.0.1:8317 \
  ANTHROPIC_AUTH_TOKEN=${AHMED_CLIPROXY_TOKEN:?not set in ~/.ahmedsecrets} \
  CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1 \
  CLAUDE_CODE_ALWAYS_ENABLE_EFFORT=1 \
  ENABLE_TOOL_SEARCH=true \
  ENABLE_CLAUDEAI_MCP_SERVERS=false \
  claude --allow-dangerously-skip-permissions'

# Shell integrations
if [[ -o interactive ]]; then
    eval "$(fzf --zsh)"
    eval "$(zoxide init --cmd cd zsh)"
fi

# ASCII BOAT SHELL INTEGRATION START boat
boat() {
  current_file=$(mktemp)
  convo_file=$(mktemp)
  old_current_file=${BOAT_CURRENT_ID_FILE-}
  old_convo_file=${BOAT_CURRENT_CONVO_FILE-}
  export BOAT_CURRENT_ID_FILE="$current_file"
  export BOAT_CURRENT_CONVO_FILE="$convo_file"
  command "/home/ahmedisam99/.ascii/bin/boat" "$@"
  boat_status=$?
  if [ "$boat_status" -eq 0 ]; then
    case "${1:-}" in
      new|start|fork)
        if [ -s "$current_file" ]; then
          current_id=$(tr -d '[:space:]' < "$current_file")
          if [ -n "$current_id" ]; then export BOAT_CURRENT_ID="$current_id"; fi
        fi
        ;;
    esac
    case "${1:-}" in
      prompt)
        if [ -s "$convo_file" ]; then
          IFS= read -r current_convo < "$convo_file" || current_convo=""
          if [ -n "$current_convo" ]; then export BOAT_CURRENT_CONVO="$current_convo"; fi
        fi
        ;;
    esac
  fi
  if [ -n "$old_current_file" ]; then export BOAT_CURRENT_ID_FILE="$old_current_file"; else unset BOAT_CURRENT_ID_FILE; fi
  if [ -n "$old_convo_file" ]; then export BOAT_CURRENT_CONVO_FILE="$old_convo_file"; else unset BOAT_CURRENT_CONVO_FILE; fi
  rm -f "$current_file" "$convo_file"
  return "$boat_status"
}
# ASCII BOAT SHELL INTEGRATION END boat

# Vite+ bin (https://viteplus.dev)
. "/home/ahmedisam99/.config/vite-plus/env"
