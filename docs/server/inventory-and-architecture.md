# Inventaris Server dan Arsitektur Produksi

## Host dan aplikasi
Server produksi berjalan pada Lenovo IdeaPad 300-14ISK dengan Ubuntu Server 26.04.1 LTS. Mesin ini berbeda dari PC Windows yang menjalankan layanan AI.

- Root deployment: /home/galih/apps/sentanu-jaya/
- Release aktif melalui symlink current: releases/20261113-101450-8abbd91
- Backend Laravel: current/backend
- Frontend React build: current/frontend/dist
- Shared environment: /home/galih/apps/sentanu-jaya/shared/.env
- Shared storage: /home/galih/apps/sentanu-jaya/shared/storage
- Backup: /home/galih/apps/sentanu-jaya/shared/backups
- Nginx site: /etc/nginx/sites-enabled/sentanu-jaya
- PHP-FPM socket tercatat: /run/php/php8.5-fpm.sock
- PostgreSQL 16, database sentanu_jaya_prod, bind localhost 127.0.0.1:5432
- cloudflared tunnel menuju origin Nginx HTTP port 80; hostname dan Access policy perlu dicek terpisah.

Backend release memakai symlink backend/.env ke shared/.env dan backend/storage ke shared/storage. Jangan menimpa shared state saat deploy.

## Layanan terverifikasi pada snapshot audit
Nginx, PHP-FPM 8.5, PostgreSQL 16, cloudflared, dan UFW aktif. nginx -t berhasil; systemctl --failed kosong; request lokal ke http://192.168.0.181/ menghasilkan HTTP 200. Ini snapshot, bukan jaminan status live.

## Resource snapshot
Root logical volume ext4 sekitar 98 GiB (17 GiB terpakai, 77 GiB bebas). RAM sekitar 10 GiB, available 8.4 GiB; swap 4 GiB belum terpakai. Disk /dev/sda terdeteksi ST500LM000-SSHD 465.8G.

## Risiko disk
SMART overall PASSED, tetapi log mencatat 28 ATA errors dan beberapa UNC read errors pada LBA tertentu. Reallocated, pending, dan offline-uncorrectable sectors tercatat 0. Riwayat instalasi Ubuntu sebelumnya juga mengalami I/O errors.

Interpretasi: ada indikasi risiko media penyimpanan. SMART PASSED tidak menghapus arti error baca yang tercatat. Prioritaskan backup ke lokasi lain dan rencanakan penggantian disk dengan SSD. Jangan jalankan destructive surface test atau filesystem repair sebelum backup eksternal diverifikasi.

## Jaringan
Wi-Fi wlp2s0, Qualcomm Atheros QCA9377 (ath10k_pci), IP server 192.168.0.181/24, gateway/DNS 192.168.0.1. Ethernet enp1s0 tercatat DOWN. PC Windows AI 192.168.0.51. TCP 20128 dan 11434 dapat dijangkau dari Ubuntu pada saat pemeriksaan. Ping/ICMP gagal, tetapi TCP berhasil; ping gagal bukan bukti service tidak dapat dijangkau.

## Belum diverifikasi
- Spesifikasi CPU/RAM persis perlu diperiksa ulang dengan lscpu dan free.
- Hostname publik, DNS, dan Cloudflare Access policy belum dibuktikan.
- IPv6 firewall rules belum diaudit terpisah.
- Kondisi SMART dan kapasitas harus dicek ulang sebelum maintenance.
- Status di atas merupakan snapshot, bukan live monitoring.
