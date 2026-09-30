import { useEffect, useState } from "react";
import {
  TREASURY_ADDRESS,
  getTreasuryBalance,
  formatTon,
} from "../utils/tonWallet";

export default function TonWallet({ balance = 0 }) {
  const [treasury, setTreasury] = useState(null);
  const [copied, setCopied] = useState("");
  const [amount, setAmount] = useState("10");

  useEffect(() => {
    let alive = true;
    const load = () => getTreasuryBalance().then((b) => { if (alive) setTreasury(b); });
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const copyAddr = async () => {
    try {
      await navigator.clipboard.writeText(TREASURY_ADDRESS);
      setCopied("adres");
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  const copyMemo = async () => {
    const note = `ASTRO ${amount} CITV`;
    try {
      await navigator.clipboard.writeText(note);
      setCopied("not");
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  return (
    <div className="ton-wallet">
      <h3>TON Cuzdan</h3>
      <p className="muted">Sadece TON agi. Otomatik bakiye yok — transfer sonra dogrulama.</p>

      <div className="ton-card">
        <div className="ton-row">
          <span>Oyuncu bakiyesi</span>
          <b>{formatTon(balance)} CITV</b>
        </div>
        <div className="ton-row">
          <span>Hazine</span>
          <code className="ton-addr">{TREASURY_ADDRESS}</code>
        </div>
        <label className="ton-row">
          <span>Yatir (CITV)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
          />
        </label>
        <button className="btn" onClick={copyAddr}>
          {copied === "adres" ? "Kopyalandi" : "Adresi kopyala"}
        </button>
        <button className="btn" onClick={copyMemo}>
          {copied === "not" ? "Kopyalandi" : "Transfer notunu kopyala"}
        </button>
      </div>

      <div className="ton-card">
        <div className="ton-row">
          <span>Hazine TON</span>
          <b>{treasury ? formatTon(treasury.ton) + " TON" : "..."}</b>
        </div>
        <div className="ton-row">
          <span>Durum</span>
          <b>{treasury?.state || "bekleniyor"}</b>
        </div>
      </div>
    </div>
  );
}
