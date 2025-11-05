[[ -f ~/.zshrc ]] && . ~/.zshrc

export XDG_DATA_HOME=$HOME/.local/share
export XDG_STATE_HOME=$HOME/.local/state
export XDG_CONFIG_HOME=$HOME/.config
export XDG_CACHE_HOME=$HOME/.cache

# Added by Jetbrains Toolbox App
export PATH="$PATH:/home/ahmedisam99/.local/share/JetBrains/Toolbox/scripts"

# personal scripts
export PATH="$HOME/scripts:$PATH"

# SSH
eval $(keychain --quiet --eval id_ed25519_personal id_ed25519_work)
