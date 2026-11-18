# Runbook Operasional Ubuntu

## Prinsip
Jaga ERP tetap online. Mulai dari pemeriksaan read-only. Jangan reboot, restart network, mengubah firewall, atau mengubah database tanpa penyebab jelas dan rencana rollback.

## Status host dan layanan
hostnamectl
uptime
free -h
df -hT
systemctl --failed
systemctl status nginx php8.5-fpm postgresql cloudflared --no-pager

Nama unit PHP-FPM dapat berubah setelah upgrade; verifikasi dengan systemctl list-units 'php*-fpm.service'.

## Nginx dan HTTP
sudo nginx -t
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1/
sudo journalctl -u nginx -n 100 --no-pager

HTTP 200 halaman root tidak membuktikan login, transaksi, invoice, atau semua modul sehat.

## PostgreSQL
systemctl status postgresql --no-pager
sudo -u postgres pg_isready
sudo -u postgres psql -d sentanu_jaya_prod -c 'SELECT current_database(), now();'

Jangan jalankan destructive SQL di produksi.

## Jaringan
ip -brief address
ip route
resolvectl status
sudo ufw status verbose

Untuk Windows AI host, uji TCP port spesifik. Ping dapat diblokir walau TCP service tersedia.

## Nanu AI
9Router: http://192.168.0.51:20128/v1
Ollama: http://192.168.0.51:11434
Ikuti docs/nanu-ai/9router-ollama-integration.md. Jangan menjalankan curl yang mencetak Authorization header/API key. HTTP 401 dari request tanpa Authorization hanya membuktikan request itu tidak terautentikasi.

## Backup
systemctl list-timers sentanu-jaya-backup.timer --no-pager
systemctl status sentanu-jaya-backup.service --no-pager
journalctl -u sentanu-jaya-backup.service -n 100 --no-pager

Pastikan ada salinan off-host dan checksum tujuan cocok. Job backup sukses bukan bukti restore drill berhasil.

## Disk
sudo smartctl -a /dev/sda

Sesuaikan device setelah lsblk. Jika ada I/O atau UNC errors, prioritaskan backup eksternal dan penggantian disk. Jangan memulai surface test destruktif sebelum backup aman.

## Penanganan insiden
1. Catat waktu dan gejala; pastikan apakah ERP masih bisa diakses.
2. Periksa service, resource, disk, log, HTTP secara read-only.
3. Isolasi komponen: browser/DNS/Cloudflare/Nginx/PHP-FPM/Laravel/PostgreSQL/jaringan AI.
4. Terapkan perubahan terkecil setelah menyimpan kondisi awal.
5. Validasi endpoint dan alur bisnis.
6. Rollback perubahan spesifik jika memburuk; jangan reboot sebagai langkah pertama.
