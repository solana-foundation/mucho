#!/usr/bin/env bash
set -euo pipefail

########################################
# Logging Functions
########################################
log_info() {
    printf "[INFO] %s\n" "$1"
}

log_error() {
    printf "[ERROR] %s\n" "$1" >&2
}

########################################
# Install nvm and Node.js
########################################
install_nvm_and_node() {
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        log_info "NVM is already installed."
    else
        log_info "Installing NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
    fi

    export NVM_DIR="$HOME/.nvm"
    # Immediately source nvm and bash_completion for the current session
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
    else
        log_error "nvm not found. Ensure it is installed correctly."
    fi

    if [ -s "$NVM_DIR/bash_completion" ]; then
        . "$NVM_DIR/bash_completion"
    fi

    if command -v node >/dev/null 2>&1; then
        local current_node
        current_node=$(node --version)
        local latest_node
        latest_node=$(nvm version-remote node)
        if [ "$current_node" = "$latest_node" ]; then
            log_info "Latest Node.js ($current_node) is already installed."
        else
            log_info "Updating Node.js: Installed ($current_node), Latest ($latest_node)."
            nvm install node
            nvm alias default node
            nvm use default
        fi
    else
        log_info "Installing Node.js via NVM..."
        nvm install node
        nvm alias default node
        nvm use default
    fi

    echo ""
}


########################################
# Append nvm Initialization to the Correct Shell RC File
########################################
ensure_nvm_in_shell() {
    local shell_rc=""
    if [[ "$SHELL" == *"zsh"* ]]; then
        shell_rc="$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        shell_rc="$HOME/.bashrc"
    else
        shell_rc="$HOME/.profile"
    fi

    if [ -f "$shell_rc" ]; then
        if ! grep -q 'export NVM_DIR="$HOME/.nvm"' "$shell_rc"; then
            log_info "Appending nvm initialization to $shell_rc"
            {
                echo ''
                echo 'export NVM_DIR="$HOME/.nvm"'
                echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm'
            } >> "$shell_rc"
        fi
    else
        log_info "$shell_rc does not exist, creating it with nvm initialization."
        echo 'export NVM_DIR="$HOME/.nvm"' > "$shell_rc"
        echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm' >> "$shell_rc"
    fi
}

########################################
# install mucho and the solana tooling
########################################
install_mucho(){
    npx mucho@latest install
}

main() {
    install_nvm_and_node

    ensure_nvm_in_shell

    install_mucho

    echo "Installation complete. Please restart your terminal to apply all changes."
}

main "$@"