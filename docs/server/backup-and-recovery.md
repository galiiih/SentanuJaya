# Backup dan Pemulihan

## Backup database
Script /usr/local/sbin/sentanu-jaya-backup; service sentanu-jaya-backup.service; timer sentanu-jaya-backup.timer. Jadwal harian 01:00, Persistent=true. Database sentanu_jaya_prod, format PostgreSQL custom archive, validasi pg_restore --list, checksum SHA-256, retention 14 hari. Lokasi /home/galih/apps/sentanu-jaya/shared/backups.

Script menggunakan temporary file, flock, permission terbatas, validasi archive sebelum rename, dan checksum. Backup yang tercatat pada 13, 15, 16, dan 17 November 2026 berhasil. Lima archive diperiksa dengan pg_restore --list; empat checksum yang diperiksa cocok. Ini membuktikan archive dapat dibaca sebagai daftar objek, bukan restore penuh berhasil.

## Kesenjangan
1. Backup masih berada pada disk fisik server yang sama.
2. Belum ada bukti backup off-host.
3. Belum ada restore drill terverifikasi ke database terpisah.
4. Database dump tidak mencakup shared .env, file upload, file template di filesystem, konfigurasi Nginx/PHP-FPM, Cloudflare Tunnel credentials/config, unit systemd, dan artefak deployment.
5. Kebijakan enkripsi backup off-host belum dibuktikan.

## Prioritas
1. Salin backup terbaru ke perangkat/lokasi lain dan verifikasi SHA-256 di tujuan.
2. Buat backup konfigurasi non-secret untuk recovery; simpan secret secara aman di luar Git.
3. Audit file uploads/template di filesystem. Data yang tersimpan di PostgreSQL ikut dalam dump; file-based uploads tidak.
4. Restore drill ke database sementara, bukan produksi.
5. Catat durasi restore dan validasi aplikasi.

## Pemeriksaan
systemctl status sentanu-jaya-backup.timer --no-pager
systemctl list-timers sentanu-jaya-backup.timer --no-pager
systemctl status sentanu-jaya-backup.service --no-pager
journalctl -u sentanu-jaya-backup.service -n 100 --no-pager
sudo ls -lh /home/galih/apps/sentanu-jaya/shared/backups/

Restore harus ke database target yang dipastikan bukan produksi, dengan role/permission sesuai. Tidak ada restore produksi yang dilakukan sebagai bagian dokumentasi ini.
