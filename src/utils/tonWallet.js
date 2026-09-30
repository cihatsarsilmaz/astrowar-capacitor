// TON Connect + CITV jetton helpers (TEP-74)
// Replace CITV_MASTER with your deployed jetton master address after minting.

export const CITV_MASTER = "EQD1b5acdfdc693923ae985b1153f4301ea0ddd8cdd7c4d4ad4a91561df5e106b8f"; // placeholder
export const USDT_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"; // TON USDT

export const TREASURY_ADDRESS = "EQERtazf3Gk5I66YWxFT9DAeoN3YzdfE1K1KkVYd9eEGuP"; // AstrogameWAR treasury (v4R2)
export const TREASURY_RAW = "0:1b5acdfdc693923ae985b1153f4301ea0ddd8cdd7c4d4ad4a91561df5e106b8f";

export const TON_API = "https://tonapi.io/v2";

export async function getTreasuryBalance() {
  try {
    const r = await fetch(`${TON_API}/accounts/${TREASURY_RAW}`);
    if (!r.ok) return null;
    const j = await r.json();
    return {
      ton: Number(j.balance || 0) / 1e9,
      state: j.status,
      lastActivity: j.last_activity || 0,
    };
  } catch {
    return null;
  }
}

export async function verifyCitvDeposit(txHash, expectedAmount) {
  // Backend should call tonapi /blockchain/transactions/{hash} and check
  // jetton transfer to TREASURY_RAW with >= expectedAmount. Stub for now.
  return { ok: true, amount: expectedAmount, hash: txHash };
}

export function formatTon(n) {
  return (Number(n) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 4 });
}
