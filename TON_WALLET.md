# TON CITV Wallet

## Treasury address (v4R2, mainnet)
- Friendly: `EQERtazf3Gk5I66YWxFT9DAeoN3YzdfE1K1KkVYd9eEGuP`
- Raw: `0:1b5acdfdc693923ae985b1153f4301ea0ddd8cdd7c4d4ad4a91561df5e106b8f`

> Bu adres deterministik üretilmiş bir placeholder'dır. Gerçek fon tutmak için
> kendi mnemonic'inden türetilmiş bir cüzdan kullan; private key'i asla repoya koyma.

## Flow
1. Oyuncu cüzdanını TON Connect ile bağlar.
2. CITV jetton'u treasury adresine gönderir.
3. Backend `tonapi` ile 3 onay bekler, `gs.tonBalance`'a yazar.
4. Oyuncu "Yükle" deyince DM/metal'e çevrilir.

## Deploy checklist
- [ ] CITV jetton master mint et
- [ ] `CITV_MASTER` sabitini doldur
- [ ] `POST /ton/deposit` endpoint'ini functions/index.js'e ekle
- [ ] tonconnect-manifest.json url/iconUrl'i production'a çevir
