# AstrogameWAR — Kurulum ve Deploy Rehberi

## Firebase Cloud Functions dağıtımı

Functions dağıtımı GitHub Actions üzerinden `main` dalına push veya manuel workflow çalıştırmasıyla başlar. Dağıtımın çalışması için iki GitHub Actions değeri zorunludur:

1. **Secret** `FIREBASE_TOKEN`: Firebase CLI kimlik doğrulama token'ı.
2. **Variable** `FIREBASE_PROJECT_ID`: Firebase projesinin gerçek Project ID değeri (görünen proje adı değil).

Ayar yolu: Repository → **Settings → Secrets and variables → Actions**.

- **Secrets** sekmesinde `FIREBASE_TOKEN` oluştur.
- **Variables** sekmesinde `FIREBASE_PROJECT_ID` oluştur.
- Token değerini kaynak koda, issue'lara veya sohbet mesajlarına ekleme.
- Değerlerden biri eksikse workflow artık Firebase dağıtımını başlatmadan açıklayıcı hata verecek.

GitHub Actions ayarlarına erişim yoksa repo yöneticisinin bu iki değeri eklemesi gerekir. Bu değişiklik tek başına Firebase projesi oluşturmaz ve ücretli planı etkinleştirmez. Cloud Functions dağıtımı Firebase projesinin plan/servis gereksinimlerine bağlıdır; ücretli plana geçiş ayrıca onay gerektirir.

## Dağıtım doğrulama

Yapılandırma eklendikten sonra GitHub → **Actions** → **Deploy Firebase Functions** → **Run workflow** ile manuel doğrulama yapılabilir. Bu adım gerçek Functions dağıtımı başlatır; yalnızca proje sahibi/operatör açıkça onayladığında çalıştırılmalıdır.

## Oyun ve tasarımın korunması

Bu düzeltme yalnızca dağıtım iş akışına dokunur. Oyun kaynak kodu, mevcut oyunlar, görsel tasarım ve Android dosyaları değiştirilmez.
