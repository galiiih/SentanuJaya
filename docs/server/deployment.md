# Deployment Sentanu Jaya ERP di Ubuntu

## Layout
/home/galih/apps/sentanu-jaya/ berisi current -> releases/<release>, direktori releases, dan shared/. Shared menyimpan .env, storage, dan backups. Backend release memakai symlink ke shared/.env dan shared/storage. Frontend dibangun ke frontend/dist dan disajikan Nginx; Laravel dilayani PHP-FPM.

## Runtime snapshot
Ubuntu Server 26.04.1 LTS, PHP-FPM 8.5 (socket /run/php/php8.5-fpm.sock), PostgreSQL 16, Nginx, Laravel backend, React frontend. Versi dependency aplikasi yang otoritatif tetap backend/composer.json dan frontend/package.json. Jangan menganggap versi PHP CLI sama dengan PHP-FPM tanpa pemeriksaan.

## Sebelum deployment
1. Pastikan branch dan commit target benar.
2. Periksa diff dan CI; jangan deploy working tree yang tidak diketahui.
3. Pastikan backup database valid dan salin ke lokasi off-host.
4. Pastikan shared .env tetap di luar release dan tidak masuk artefak.
5. Pastikan Nginx/PHP-FPM sesuai runtime.
6. Build frontend dan install dependency backend di release baru, bukan dengan mengubah release aktif.
7. Tinjau migration dan backup sebelum menjalankannya.
8. Cutover setelah pemeriksaan selesai; uji HTTP lokal dan alur bisnis kritis.
9. Pertahankan release sebelumnya sampai release baru stabil.

## Rollback
Symlink current memungkinkan kembali ke release sebelumnya. Namun perubahan schema/database mungkin tidak dapat dibalik hanya dengan mengganti symlink. Catat target current sebelum cutover. Rollback migration tidak boleh otomatis tanpa analisis kompatibilitas data.

Pada snapshot terdapat tiga release sekitar 361–362 MB; release aktif tercatat 20261113-101450-8abbd91. Jangan menghapus release lama sebelum kebutuhan rollback dipastikan. Checkout dengan kapitalisasi berbeda /home/galih/apps/SentanuJaya pernah ditemukan tanpa vendor; path deployment yang benar menggunakan sentanu-jaya huruf kecil.

## Larangan
Jangan jalankan migrate:fresh pada produksi; jangan menimpa shared .env/storage; jangan reboot host untuk perubahan aplikasi biasa; jangan hapus release lama tanpa rollback plan; jangan tampilkan secret saat memeriksa konfigurasi.
