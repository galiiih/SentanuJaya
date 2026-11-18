# Keamanan, Firewall, dan Akses Jaringan

## Baseline snapshot
- UFW aktif; incoming default deny, outgoing allow, routed forwarding disabled.
- TCP 22 diizinkan dari subnet LAN 192.168.0.0/24.
- TCP 9090 diizinkan dari subnet LAN (Cockpit).
- TCP 80 diizinkan dari LAN ke 192.168.0.181.
- SSH: PermitRootLogin no, PasswordAuthentication no, PubkeyAuthentication yes, MaxAuthTries 6.
- PostgreSQL bind localhost 127.0.0.1:5432.
- CUPS tercatat hanya localhost.
- Avahi mDNS UDP 5353 aktif.
- Cockpit socket tercatat listen [::]:9090, dengan akses UFW LAN pada snapshot.

Ini bukan pengganti pemeriksaan rules/listener saat ini. IPv6 firewall rules belum diperiksa terpisah.

## Pemeriksaan read-only
sudo ufw status verbose
sudo ss -tulpn
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|pubkeyauthentication|maxauthtries'
sudo nginx -t
systemctl --failed

## Cloudflare Tunnel
cloudflared tercatat aktif dan origin Nginx memakai HTTP port 80. Status service aktif tidak otomatis membuktikan hostname, DNS, Access policy, atau proteksi semua route benar. Verifikasi melalui dashboard/host tanpa membocorkan credentials.

## Catatan hardening
- Fail2ban tidak ditemukan pada snapshot; ini bukan bukti tidak ada kontrol lain.
- X11Forwarding tercatat aktif; evaluasi kebutuhan sebelum mengubah akses remote.
- Tinjau IPv6 firewall/listener.
- Jangan expose port 20128/11434 ke internet. Batasi ke LAN privat/VPN yang diperlukan.
- Jangan mengubah UFW, routing, SSH, atau Cloudflare saat sesi remote aktif tanpa rollback dan akses alternatif.

## Jaringan AI
Ubuntu ERP 192.168.0.181 mengakses Windows PC 192.168.0.51 melalui LAN: 9Router TCP 20128 dan Ollama TCP 11434. Pembatasan Windows Firewall dan bind address harus diverifikasi pada host Windows; audit Ubuntu saja tidak membuktikan policy Windows.
