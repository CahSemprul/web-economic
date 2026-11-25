# Panduan Deploy EkonAnalisis di VPS (RAM 1GB) — Domain `dreceh.my.id`

## Prasyarat VPS
- Ubuntu 22.04 / 24.04 atau Debian 12
- Node.js **v22+** (`node -v`)
- Caddy (HTTPS otomatis) atau Nginx + Certbot

## 1. Arahkan DNS Domain `dreceh.my.id`
Di panel DNS registrar domain Anda (Cloudflare / Niagahoster / Rumahweb / dll.):
- `A` record `@` -> IP publik VPS Anda
- `A` record `www` -> IP publik VPS Anda (akan diarahkan 301 otomatis ke `https://dreceh.my.id`)

## 2. Ekstrak & Bangun Aplikasi di VPS
```bash
mkdir -p /var/www
unzip ekonanalisis-dreceh.zip -d /var/www/
cd /var/www/ekonanalisis-dreceh

cp .env.example .env
nano .env
```
Isi `.env`:
```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY="ISI_KUNCI_GEMINI_ANDA"
PUBLIC_SITE_URL="https://dreceh.my.id"
```

Install dependensi, build frontend statis, lalu rampingkan paket dev (opsional untuk hemat ruang VPS):
```bash
npm install
npm run build
npm prune --omit=dev
```

## 3. Jalankan Backend Node.js (Hemat RAM)
Salin unit service systemd:
```bash
sudo chown -R www-data:www-data /var/www/ekonanalisis-dreceh
sudo cp deploy/ekonanalisis.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ekonanalisis
sudo systemctl status ekonanalisis
```

## 4. Aktifkan HTTPS Reverse Proxy (Pilih Caddy atau Nginx)
**Opsi A — Caddy (SSL otomatis tanpa konfigurasi Certbot):**
```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

**Opsi B — Nginx + Certbot:**
```bash
sudo cp deploy/nginx-dreceh.conf /etc/nginx/sites-available/dreceh.my.id
sudo ln -s /etc/nginx/sites-available/dreceh.my.id /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dreceh.my.id -d www.dreceh.my.id
```

## 5. Verifikasi SEO & Google Search Console
Setelah `https://dreceh.my.id` aktif:
1. Cek `https://dreceh.my.id/robots.txt`, `https://dreceh.my.id/sitemap.xml`, dan `https://dreceh.my.id/llms.txt`.
2. Di Google Search Console, verifikasi properti `https://dreceh.my.id` menggunakan metode **Tag HTML** (`google-site-verification` sudah terpasang di `index.html`).
3. Kirimkan `https://dreceh.my.id/sitemap.xml` pada menu **Sitemaps**.
