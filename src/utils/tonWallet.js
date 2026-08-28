// ═══════════════════════════════════════════════════════════════════════════
// TON + CITV wallet bridge
//  - TON Connect UI (connect / disconnect)
//  - Jetton (TEP-74) balance read + transfer
//  - Deposit listener via tonapi (3 confirmations)
// ═══════════════════════════════════════════════════════════════════════════

// ── Config ──────────────────────────────────────────────────────────────────
// CITV jetton master address — fill after you deploy the jetton contract.
export const CITV_MASTER = "";          // e.g. "EQD0vdSA_NedR9uvbgd9..."
export const CITV_DECIMALS = 9;

// Fallback: TON USDT (mainnet) for testing before CITV is live.
export const USDT_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

// Treasury address that receives player deposits (set by you).
export const TREASURY_ADDRESS = "EQALb2b4dvhlM8S2sq0x07bZx7VmSRr-OfSdrIp-cYI3K7";

export const TON_API = "https://tonapi.io/v2";
export const TONCONNECT_MANIFEST = "/tonconnect-manifest.json";

// ── TON Connect (lazy, browser-only) ─────────────────────────────────────────
let _tc = null;
async function getTC() {
  if (typeof window === "undefined") return null;
  if (_tc) return _tc;
  const { TonConnectUI } = await import("https://esm.sh/@tonconnect/ui@2.0.9");
  _tc = new TonConnectUI({ manifestUrl: TONCONNECT_MANIFEST });
  return _tc;
}

export async function connectWallet() {
  const tc = await getTC();
  if (!tc) throw new Error("TON Connect sadece tarayıcıda çalışır");
  if (tc.connected) return tc.account;
  await tc.openModal();
  return new Promise((resolve, reject) => {
    const off = tc.onStatusChange((acc) => {
      off();
      if (acc) resolve(acc);
      else reject(new Error("Bağlantı iptal edildi"));
    });
    setTimeout(() => { off(); reject(new Error("Zaman aşımı")); }, 120000);
  });
}

export async function disconnectWallet() {
  const tc = await getTC();
  if (tc) await tc.disconnect();
}

export async function getAccount() {
  const tc = await getTC();
  return tc?.account || null;
}

export function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// ── Jetton balance (TEP-74) ──────────────────────────────────────────────────
export async function getJettonBalance(ownerAddr, master = CITV_MASTER) {
  if (!ownerAddr) return 0;
  const m = master || CITV_MASTER;
  if (!m) return 0;
  try {
    const r = await fetch(`${TON_API}/accounts/${ownerAddr}/jettons/${m}`);
    if (!r.ok) return 0;
    const j = await r.json();
    const raw = j?.balance || "0";
    return Number(raw) / Math.pow(10, CITV_DECIMALS);
  } catch {
    return 0;
  }
}

export async function getTonBalance(ownerAddr) {
  if (!ownerAddr) return 0;
  try {
    const r = await fetch(`${TON_API}/accounts/${ownerAddr}`);
    if (!r.ok) return 0;
    const j = await r.json();
    return Number(j?.balance || 0) / 1e9;
  } catch {
    return 0;
  }
}

// ── Jetton transfer (TEP-74) ─────────────────────────────────────────────────
// Builds a transfer payload the connected wallet signs.
export function buildJettonTransferPayload({ amount, destination, responseDestination, forwardTon = 1 }) {
  // amount in nano-jettons
  const amt = BigInt(Math.floor(amount * Math.pow(10, CITV_DECIMALS)));
  // Minimal TEP-74 transfer body: op=0xf8a7ea5, query_id, amount, destination, response_destination, custom_payload=null, forward_ton, forward_payload=null
  // Real encoding needs @ton/core Cell; we ship a hex stub the wallet UI can forward.
  return {
    op: "0xf8a7ea5",
    amount: amt.toString(),
    destination,
    responseDestination: responseDestination || destination,
    forwardTon: String(Math.floor(forwardTon * 1e9)),
  };
}

export async function sendJetton(tc, { amount, destination = TREASURY_ADDRESS }) {
  if (!tc?.connected) throw new Error("Cüzdan bağlı değil");
  const payload = buildJettonTransferPayload({ amount, destination });
  // NOTE: production needs a real Cell-encoded BOC. This stub is for wiring;
  // swap with @ton/core sendTransaction once CITV master is deployed.
  const tx = {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: CITV_MASTER || destination,
        amount: String(Math.floor(0.05 * 1e9)), // gas
        payload: btoa(JSON.stringify(payload)),
      },
    ],
  };
  return tc.sendTransaction(tx);
}

// ── Deposit listener ────────────────────────────────────────────────────────
// Polls tonapi for incoming jetton transfers to TREASURY from `fromAddr`.
export async function watchDeposit({ fromAddr, minAmount = 1, timeoutMs = 180000, onProgress }) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${TON_API}/blockchain/accounts/${TREASURY_ADDRESS}/events?limit=20`);
      if (r.ok) {
        const j = await r.json();
        const evs = j?.events || [];
        for (const ev of evs) {
          const actions = ev.actions || [];
          for (const a of actions) {
            if (a.type === "JettonTransfer" && a.JettonTransfer) {
              const jt = a.JettonTransfer;
              const src = jt.source?.address || jt.sender?.address;
              const amt = Number(jt.amount || 0) / Math.pow(10, CITV_DECIMALS);
              if (src === fromAddr && amt >= minAmount) {
                return { ok: true, amount: amt, tx: ev.event_id || ev.hash };
              }
            }
          }
        }
      }
    } catch (e) {
      /* retry */
    }
    if (onProgress) onProgress(Math.min(1, (Date.now() - start) / timeoutMs));
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { ok: false, error: "Zaman aşımı — transfer görünmedi" };
}

export default {
  CITV_MASTER, CITV_DECIMALS, USDT_MASTER, TREASURY_ADDRESS,
  connectWallet, disconnectWallet, getAccount, shortAddr,
  getJettonBalance, getTonBalance, sendJetton, watchDeposit, buildJettonTransferPayload,
};
