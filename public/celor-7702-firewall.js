/**
 * CELOR 7702 Shield — Standalone Open-Source 0x05 & EIP-6963 Signer Firewall (v6.7)
 * License: MIT | Repository: https://github.com/celor-sol/celor
 *
 * Protects browser EVM wallets (MetaMask, Rabby, Phantom, Coinbase Wallet, Frame) against:
 *  1. Unauthorized EIP-7702 (0x05) code delegations (wallet_signAuthorization / eth_signAuthorization)
 *  2. Cross-chain wildcard replay tuples (chainId === 0 -> valid across all EVM chains simultaneously)
 *  3. Type-0x04 transactions containing non-zero authorizationList / authorization_list sweeper targets
 *  4. Raw 0x05 RLP preimage blind-signing via eth_sign / personal_sign
 *  5. EIP-6963 multi-injected provider bypasses (eip6963:announceProvider)
 */
(function () {
  "use strict";

  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

  function inspect7702Payload(payload) {
    const method = String(payload?.method || "");
    const params = Array.isArray(payload?.params) ? payload.params : [];

    // 1. Direct EIP-7702 Authorization Signing
    if (method === "wallet_signAuthorization" || method === "eth_signAuthorization") {
      const auth = params[0] || {};
      const target = String(auth.contractAddress || auth.address || "").toLowerCase();
      const cId = Number(auth.chainId ?? 1);
      if (target && target !== ZERO_ADDR) {
        const allow = window.confirm(
          `[CELOR 7702 SHIELD ALERT]\n\n` +
            `A dApp is requesting an EIP-7702 (0x05) Code Delegation that hands full execution control of your EOA to contract:\n` +
            `${target}\n` +
            `Chain ID: ${cId === 0 ? "0 (WILDCARD ALL-CHAIN REPLAY RISK!)" : cId}\n\n` +
            `Press Cancel to BLOCK this delegation.`
        );
        if (!allow) {
          throw new Error("Blocked by CELOR 7702 Shield: Unauthorized EIP-7702 (0x05) code delegation rejected.");
        }
      }
    }

    // 2. Type-0x04 Transaction Carrying Non-Zero authorizationList
    if ((method === "eth_sendTransaction" || method === "eth_signTransaction") && params[0]) {
      const tx = params[0];
      const authList = tx.authorizationList || tx.authorization_list;
      if (Array.isArray(authList) && authList.length > 0) {
        const nonZero = authList.find((a) => {
          const addr = String(a?.address || a?.contractAddress || "").toLowerCase();
          return addr && addr !== ZERO_ADDR;
        });
        if (nonZero) {
          const addr = String(nonZero.address || nonZero.contractAddress);
          const allow = window.confirm(
            `[CELOR 7702 SHIELD ALERT]\n\n` +
              `Type-0x04 Transaction contains an EIP-7702 authorizationList delegating your wallet to:\n${addr}\n\n` +
              `Press Cancel to BLOCK this sweeper delegation.`
          );
          if (!allow) {
            throw new Error("Blocked by CELOR 7702 Shield: Type-0x04 sweeper delegation rejected.");
          }
        }
      }
    }

    // 3. Raw 0x05 RLP Preimage Blind-Signing via eth_sign / personal_sign
    if (method === "eth_sign" || method === "personal_sign") {
      for (const p of params) {
        const rawHex = String(p || "").toLowerCase();
        if (rawHex.startsWith("0x05c") || rawHex.startsWith("0x05f") || rawHex.startsWith("0x05d")) {
          throw new Error("Blocked by CELOR 7702 Shield: Raw 0x05 EIP-7702 RLP preimage blind-signing blocked.");
        }
      }
    }
  }

  function wrapProvider7702(prov) {
    if (!prov || prov.__celor7702ShieldInstalled) return;
    prov.__celor7702ShieldInstalled = true;

    if (typeof prov.request === "function") {
      const origRequest = prov.request.bind(prov);
      prov.request = async function (payload) {
        inspect7702Payload(payload);
        return origRequest(payload);
      };
    }

    if (typeof prov.sendAsync === "function") {
      const origSendAsync = prov.sendAsync.bind(prov);
      prov.sendAsync = function (payload, cb) {
        try {
          inspect7702Payload(payload);
        } catch (err) {
          if (typeof cb === "function") return cb(err, null);
          throw err;
        }
        return origSendAsync(payload, cb);
      };
    }

    if (typeof prov.send === "function") {
      const origSend = prov.send.bind(prov);
      prov.send = function (methodOrPayload, paramsOrCb) {
        if (typeof methodOrPayload === "string") {
          inspect7702Payload({ method: methodOrPayload, params: paramsOrCb });
        } else {
          inspect7702Payload(methodOrPayload);
        }
        return origSend(methodOrPayload, paramsOrCb);
      };
    }
  }

  function installFirewall() {
    if (typeof window === "undefined") return;
    if (window.ethereum) {
      wrapProvider7702(window.ethereum);
      if (Array.isArray(window.ethereum.providers)) {
        window.ethereum.providers.forEach(wrapProvider7702);
      }
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("eip6963:announceProvider", (ev) => {
      if (ev?.detail?.provider) wrapProvider7702(ev.detail.provider);
    });
    installFirewall();
    setTimeout(installFirewall, 1000);
  }
})();
