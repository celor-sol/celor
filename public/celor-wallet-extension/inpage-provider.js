/**
 * CELOR TRENCH WALLET — Window Provider (`window.celor` / Solana Wallet-Standard)
 * Bridges dApps (Pump.fun, Photon, BullX, Jupiter, Raydium) to the local Celor Wallet Backend.
 */
(function () {
  if (window.celor) return;

  const rpcEndpoint = "http://127.0.0.1:45990";
  let sessionToken = null;
  let connectedPubkey = null;

  async function callBackend(method, params = {}) {
    const headers = { "Content-Type": "application/json" };
    if (sessionToken) headers["X-Celor-Auth-Token"] = sessionToken;
    const res = await fetch(rpcEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }

  window.celor = {
    isCelorTrenchWallet: true,
    isPhantom: false,
    quantumShield: "QUANTUMGLOW_AX_XMSS_67_CHAIN_WOTS",
    setSessionAuthToken(token) {
      sessionToken = token;
    },
    async connect(opts = {}) {
      const res = await callBackend("wallet_connect", { tier: opts.tier || "HOT" });
      connectedPubkey = res.publicKey;
      return { publicKey: { toBase58: () => connectedPubkey } };
    },
    async signTransaction(txBase64, opts = {}) {
      return callBackend("wallet_signTransaction", { transactionBase64: txBase64, ...opts });
    },
    async signAndSendTransaction(txBase64, opts = {}) {
      return callBackend("wallet_signAndSendTransaction", { transactionBase64: txBase64, ...opts });
    },
    async signAllTransactions(txsBase64, opts = {}) {
      return callBackend("wallet_signAllTransactions", { transactionsBase64: txsBase64, ...opts });
    },
    async signMessage(messageBase64, opts = {}) {
      return callBackend("wallet_signMessage", { messageBase64, ...opts });
    }
  };
})();
