import { useEffect, useState } from "react";
import {
  TREASURY_ADDRESS,
  getTreasuryBalance,
  formatTon,
} from "../utils/tonWallet";

export default function TonWallet({ balance = 0, onDeposit }) {
  const [treasury, setTreasury] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    getTreasuryBalance().then((b) => {
      if (alive) setTreasury(b);
    });
    const t = setInterval(() => {
      getTreasuryBalance().then((b) => {
        if (alive) setTreasury(b);
      });
    }, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TREASURY_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="ton-wallet">
      <h3>TON Cüzdan</h3>
      <p className="muted">CITV jetton ile bakiye yükle. Sadece TON ağı.</p>

      <div className="ton-card">
        <div className="ton-row">
          <span>Oyuncu bakiyesi</span>
          <b>{formatTon(balance)} CITV</b>
        </div>
        <div className="ton-row">
          <span>Hazine adresi</span>
          <code className="ton-addr">{TREASURY_ADDRESS}</code>
        </div>
        <button className="btn" onClick={copy}>
          {copied ? "Kopyalandı" : "Adresi kopyala"}
        </button>
      </div>

      <div className="ton-card">
        <div className="ton-row">
          <span>Hazine TON bakiyesi</span>
          <b>{treasury ? formatTon(treasury.ton) + " TON" : "…"}</b>
        </div>
        <div className="ton-row">
          <span>Durum</span>
          <b>{treasury?.state || "bekleniyor"}</b>
        </div>
      </div>

      <p className="muted small">
        CITV_MASTER henüz boş. Jetton'u bastıktan sonra
        src/utils/tonWallet.js içindeki sabiti doldur.
      </p>
    </div>
  );
}
