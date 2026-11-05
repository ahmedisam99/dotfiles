export XDG_DATA_HOME=$HOME/.local/share
export XDG_STATE_HOME=$HOME/.local/state
export XDG_CONFIG_HOME=$HOME/.config
export XDG_CACHE_HOME=$HOME/.cache

# Added by Jetbrains Toolbox App
export PATH="$PATH:$HOME/.local/share/JetBrains/Toolbox/scripts"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
# bun end

# local bin
export PATH="$HOME/.local/bin:$PATH"

# Java
export JAVA_HOME="/usr/lib/jvm/default"

# android
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_USER_HOME="$HOME/.android"   # keep Android out of XDG_CONFIG_HOME
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"

# SSH
eval $(keychain --quiet --eval --immediate id_ed25519_personal id_ed25519_work)
