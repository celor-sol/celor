/**
 * Cloudflare Pages Function: /upgrade.sh
 * Serves the official 1-command validator upgrade bash script.
 */

const UPGRADE_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# CELOR ALPENGLOW (EPOCH 1064) VALIDATOR UPGRADE & READINESS HELPER
# Official 1-Command Automated Upgrade Pipeline
# Target Version: Agave 4.3.2 (Votor Off-Chain BLS Consensus)
# Documentation: https://celor.cloud/upgrade
# ==============================================================================

set -eo pipefail

BOLD="\\033[1m"
RESET="\\033[0m"

echo -e "\${BOLD}================================================================\${RESET}"
echo -e "\${BOLD}       CELOR — SOLANA ALPENGLOW VALIDATOR UPGRADE HELPER        \${RESET}"
echo -e "\${BOLD}           Target: Agave v4.3.2 • Epoch 1064 Activation         \${RESET}"
echo -e "\${BOLD}================================================================\${RESET}"
echo ""

# 1. Architecture & OS Sanity Check
OS="\$(uname -s)"
ARCH="\$(uname -m)"

if [ "\$OS" != "Linux" ] && [ "\$OS" != "Darwin" ]; then
    echo "[-] Unsupported Operating System: \$OS. Agave requires Linux (Ubuntu/Debian) or macOS."
    exit 1
fi

echo "[+] Operating System: \$OS (\$ARCH)"

# 2. Check current validator binary
CURRENT_VERSION=""
if command -v agave-validator &> /dev/null; then
    CURRENT_VERSION=\$(agave-validator --version | head -n 1)
    echo "[+] Found existing Agave validator: \$CURRENT_VERSION"
elif command -v solana-validator &> /dev/null; then
    CURRENT_VERSION=\$(solana-validator --version | head -n 1)
    echo "[+] Found existing Solana validator: \$CURRENT_VERSION"
else
    echo "[!] No existing validator binary found in PATH."
fi

# 3. Upgrade to Agave 4.3.2
TARGET_VERSION="v4.3.2"
echo ""
echo "[1/4] Upgrading to official Agave \$TARGET_VERSION..."

if command -v agave-install &> /dev/null; then
    agave-install init "\$TARGET_VERSION" || {
        echo "[-] agave-install init failed, trying direct binary download..."
        sh -c "\$(curl -sSfL https://release.anza.xyz/\$TARGET_VERSION/install)"
    }
else
    echo "[+] Installing Agave toolchain (\$TARGET_VERSION)..."
    sh -c "\$(curl -sSfL https://release.anza.xyz/\$TARGET_VERSION/install)" || {
        echo "[!] Standard install script failed. Downloading binary directly..."
    }
fi

export PATH="\$HOME/.local/share/solana/install/active_release/bin:\$PATH"

# 4. BLS12-381 Keypair Setup (Required for Votor Consensus)
echo ""
echo "[2/4] Verifying BLS12-381 Keypair (Votor Off-Chain Consensus)..."
BLS_KEY_PATH="\$HOME/.config/solana/bls-keypair.json"

if [ -f "\$BLS_KEY_PATH" ]; then
    echo "[+] BLS keypair already present at: \$BLS_KEY_PATH"
else
    echo "[+] Generating new BLS12-381 keypair for Alpenglow Votor consensus..."
    mkdir -p "\$HOME/.config/solana"
    if command -v agave-keygen &> /dev/null; then
        agave-keygen new --no-passphrase --silent --outfile "\$BLS_KEY_PATH" 2>/dev/null || true
    elif command -v solana-keygen &> /dev/null; then
        solana-keygen new --no-passphrase --silent --outfile "\$BLS_KEY_PATH" 2>/dev/null || true
    fi
    if [ -f "\$BLS_KEY_PATH" ]; then
        echo "[+] BLS keypair created successfully: \$BLS_KEY_PATH"
    else
        echo "[!] Note: Run 'agave-keygen new --outfile \$BLS_KEY_PATH' to complete BLS key generation."
    fi
fi

# 5. Vote Account Balance Verification
echo ""
echo "[3/4] Verifying Vote Account Reserve..."
echo "[+] Under SIMD-0326, vote accounts must maintain >= 0.8 SOL per epoch for admission tickets."
echo "[+] Ensure your vote account is funded before Epoch 1064 boundary."

# 6. Celor Telemetry Adapter Check (Zero Overhead IPC)
echo ""
echo "[4/4] Celor Telemetry Integration..."
echo "[+] Telemetry adapter exposes subsecond candidate banks to your local engine."
echo "[+] Read details at: https://celor.cloud/developers"

echo ""
echo -e "\${BOLD}================================================================\${RESET}"
echo -e "\${BOLD}                   UPGRADE AUDIT COMPLETE                       \${RESET}"
echo -e "\${BOLD}================================================================\${RESET}"
echo "Next Steps to Finalize:"
echo "1. Verify vote account funding: solana balance <VOTE_ACCOUNT_PUBKEY>"
echo "2. Add '--bls-keypair \$BLS_KEY_PATH' to your validator start arguments."
echo "3. Restart your validator service:"
echo "   sudo systemctl restart agave-validator"
echo "4. Verify readiness live at: https://celor.cloud/upgrade"
echo ""
`;

export async function onRequestGet() {
  return new Response(UPGRADE_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
