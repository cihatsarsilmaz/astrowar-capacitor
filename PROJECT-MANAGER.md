# AstroWar — AI Project Manager

Bu dosya yalnızca **AstroWar** deposunun yönetim kaydıdır. CITVAPP ile görev, veri, yayın veya teknik kapsam paylaşılmaz.

## Yönetim ilkeleri
- Mevcut oyun tasarımı, çalışan oyun mekanikleri ve kullanıcı akışları korunur.
- Her değişiklikten önce ilgili dosya, bağımlılık ve mevcut davranış incelenir.
- Önce kök neden bulunur; geçici yama zinciri uygulanmaz.
- Değişiklikler küçük aşamalara ayrılır; her aşama test ve kanıtla kapatılır.
- Gerçek Firebase sırları, API anahtarları veya imzalama parolaları kaynak koda eklenmez.
- Üretim dağıtımı, Firebase ücretli plan değişikliği ve imzalı yayın ayrı açık onay gerektirir.

## Proje profili
- Ürün: React + Vite uzay strateji oyunu
- Mobil paket: Capacitor 7 / Android
- Backend: Firebase Auth, Firestore, App Check ve Cloud Functions
- Test: Vitest
- CI: GitHub Actions (APK ve web dağıtımı)

## İlk denetimde görülenler
- `package.json` içinde `build`, `test`, `android:sync` ve `android:build` komutları mevcut.
- APK workflow'u Node 20 ve Java 21 kullanıyor; web build, Capacitor sync ve debug APK adımlarını içeriyor.
- `src/AstrogameWAR.jsx` içinde Firebase config, admin UID ve App Check site key alanları hâlâ `BURAYA_*` yer tutucuları. Gerçek bağlantı bu dosya incelemesinden doğrulanmadı.
- README, Cloud Functions uç noktalarını ve dağıtım için gereken GitHub secret/variable değerlerini belgeliyor.
- Bu ilk kontrol kaynak dosyalarının statik incelemesidir; build, test, Firebase bağlantısı veya APK üretimi çalıştırılmış sayılmaz.

## Yönetim panosu

| Alan | Durum | Sonraki doğrulama |
|---|---|---|
| Oyun tasarımı ve mevcut mekanikler | Koruma kuralı | Regresyon testi |
| Firebase Auth / kullanıcı verisi | Doğrulanmadı | Config, kurallar ve oturum akışı |
| Firestore veri bütünlüğü | Doğrulanmadı | Şema, erişim kuralları, yazma sınırları |
| Savaş motoru / sunucu otoritesi | Kısmen belgeli | İstemci girdilerinin güven sınırı |
| Admin yetkileri | Doğrulanmadı | UID/RBAC ve admin işlemleri |
| Android / Capacitor | Workflow mevcut | Gerçek CI sonucu ve APK artifact |
| Otomatik testler | Komut mevcut | Test çalıştırma ve sonuç kaydı |
| Web dağıtımı | Workflow belgeli | Son başarılı deployment |

## Uygulama aşamaları
1. **Baseline:** son commit, workflow sonuçları, build ve test durumunu kaydet.
2. **Auth ve güvenlik:** Firebase yapılandırması, kullanıcı oturumu, Firestore rules, App Check ve admin yetkilerini doğrula.
3. **Oyun backend'i:** kayıt/yükleme, savaş çözümü, sonuç doğrulama ve tekrar gönderim/idempotency sınırlarını denetle.
4. **Android:** web build → Capacitor sync → Gradle APK; artifact ve logları doğrula.
5. **Regresyon:** oyun ekranları, kaynak üretimi, araştırma, filo, savaş ve kayıt/yükleme akışlarını test et.
6. **Rapor:** yalnızca kanıtlanan işleri tamamlandı olarak işaretle; kalan riskleri açıkça listele.

## Tamamlanma ölçütü
Her aşama için commit/PR bağlantısı, çalıştırılan komut veya workflow, test sonucu ve bilinen risk kaydı bulunmadan aşama tamamlandı sayılmaz.
