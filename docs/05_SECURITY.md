# SECURITY DESIGN
## Sentanu ERP — V1

Dokumen ini wajib dibaca developer sebelum menulis baris kode pertama. Keamanan ERP berbeda dari website biasa: ancaman terbesar bukan peretas dari luar, melainkan **penyalahgunaan dari dalam** dan **kehilangan data**.

## 0. PRIORITAS: VPS SEKARANG vs V2 NANTI

Deployment awal diasumsikan: **VPS murah, tim kecil, akses publik**. Bagian ini memisahkan mana yang wajib dikerjakan sekarang (murah & cepat) dan mana yang boleh ditunda.

Setiap sub-bagian di bawah diberi tanda:
```text
🟢 [WAJIB-VPS]     — kerjakan sekarang, murah/cepat, tidak ada alasan menunda
🟡 [SEDERHANA DULU] — versi ringan sekarang, versi lengkap menyusul
🔵 [V2 / ON-PREM]  — tunda; baru relevan saat pakai server sendiri/lokal atau skala membesar
```

| Kategori | Item | Tanda | Kenapa |
|---|---|---|---|
| Aplikasi | SoD, audit log immutable, field masking, validasi input, anti SQLi/XSS/CSRF | 🟢 | Logika kode, tidak tergantung jenis server, murah dari awal |
| Server | HTTPS, SSH key-only, firewall dasar, fail2ban | 🟢 | 30–60 menit setup di VPS mana pun |
| Database | Bukan superuser, tidak ada port publik, SSL koneksi | 🟢 | Konfigurasi standar, bukan biaya tambahan |
| Secret | Tidak di repo, APP_DEBUG=false | 🟢 | Kebiasaan kerja, tanpa biaya |
| CI/Testing | composer/npm audit, TaxEngineTest, SecurityTest, tsc build | 🟢 | Gratis, bagian dari pipeline yang sudah ada |
| Backup | Ke akun/lokasi terpisah dari VPS | 🟢 | Wajib — VPS bisa hilang/diretas kapan saja |
| WAF | Cloudflare gratis di depan VPS | 🟡 | Ganti nameserver, 15 menit, jauh lebih murah dari ModSecurity sendiri |
| Antivirus upload (ClamAV) | Boleh menyusul saat hypercare | 🟡 | Volume upload masih kecil, bisa diawasi manual sementara |
| Backup immutable/object-lock | Cukup kredensial akun terpisah dulu | 🟡 | Versi enterprise-nya mahal & rumit untuk tahap awal |
| VPN admin | SSH dari IP terbatas + key sudah cukup | 🔵 | Baru perlu saat tim/kantor tetap sudah ada |
| Row-Level Security Postgres | — | 🔵 | Berguna saat multi-branch besar, bukan sekarang |
| pgAudit | — | 🔵 | Tools forensik lanjut, bukan kebutuhan awal |
| File Integrity Monitoring | — | 🔵 | Untuk server yang dianggap bernilai tinggi/target serangan |
| Container image scanning | — | 🔵 | Hanya relevan kalau sudah pakai Docker |
| Log terpusat/SIEM | Cukup log bawaan VPS + alert email sederhana | 🔵 | SIEM penuh untuk skala tim IT yang lebih besar |

**Kesimpulan:** dari seluruh isi dokumen ini, sekitar 70% tetap dikerjakan sekarang karena murah dan berupa kebiasaan kerja yang benar sejak awal. Yang ditunda adalah bagian yang butuh infrastruktur tambahan atau baru masuk akal saat skala/nilai data sudah lebih besar.

---

## 1. MODEL ANCAMAN

| # | Ancaman | Kemungkinan | Dampak | Penanganan Utama |
|---|---|---|---|---|
| T1 | Karyawan mengubah harga/invoice untuk keuntungan pribadi | **Tinggi** | Fatal | Approval Owner + audit trail immutable |
| T2 | Penghapusan/pengubahan transaksi untuk menutupi selisih | **Tinggi** | Fatal | Posted document tidak dapat diubah, hanya reversal |
| T3 | Kebocoran data harga & margin ke kompetitor | Sedang | Tinggi | Permission field-level + log akses laporan |
| T4 | Kehilangan data (hardware rusak, ransomware) | Sedang | Fatal | Backup off-site + restore test berkala |
| T5 | Akun bersama antar staf | **Tinggi** | Tinggi | Satu user satu akun, larangan sharing di SOP |
| T6 | Serangan web umum (SQLi, XSS, CSRF) | Sedang | Tinggi | Framework + validasi + CSP |
| T7 | Upload file berbahaya lewat foto QC | Sedang | Sedang | Whitelist tipe, validasi konten, simpan di luar webroot |
| T8 | Akses data lintas branch/customer | Sedang | Sedang | Scoping otomatis di repository layer |
| T9 | Manipulasi data pajak | Rendah | Fatal | Tax master versioned + audit + approval |
| T10 | Karyawan keluar masih punya akses | **Tinggi** | Tinggi | Prosedur offboarding, nonaktif bukan hapus |

---

## 2. AUTENTIKASI

### Password
```text
Panjang minimal       : 10 karakter
Wajib                 : huruf + angka (jangan terlalu rumit, ini workshop)
Hashing               : Argon2id (atau bcrypt cost ≥ 12)
Password lama         : simpan 3 hash terakhir, larang daur ulang
First login           : wajib ganti password
Lupa password         : reset via email + token sekali pakai, kedaluwarsa 30 menit
```

### Perlindungan Brute Force
```text
5 kali gagal   → akun terkunci 15 menit
Rate limit     → 10 percobaan login per IP per menit
Notifikasi     → email ke user saat login dari perangkat baru
Logging        → semua login gagal masuk audit_logs
```

### Session & Token
```text
Access token   : JWT, umur 15 menit
Refresh token  : opaque, disimpan sebagai hash di DB, umur 7 hari, dapat dicabut
Rotasi         : refresh token berganti setiap pemakaian (detect reuse → cabut semua)
Logout         : cabut refresh token di server, bukan hanya hapus di browser
Idle timeout   : 60 menit tanpa aktivitas → logout otomatis
```

### MFA
Wajib untuk role **Owner**. Opsional untuk role lain di V1, disiapkan untuk semua.
Metode: TOTP (Google Authenticator/Authy).

---

## 3. OTORISASI

### Prinsip
1. **Deny by default** — tanpa permission eksplisit, akses ditolak.
2. **Validasi di backend** — menyembunyikan tombol di UI bukan keamanan.
3. **Least privilege** — beri hanya yang dibutuhkan untuk bekerja.

### Tiga Lapis Pemeriksaan
```text
Lapis 1 — Permission   : apakah user boleh melakukan aksi ini?  (invoice.post)
Lapis 2 — Scope        : apakah data ini di branch yang boleh diakses user?
Lapis 3 — State        : apakah dokumen dalam status yang mengizinkan aksi?
```
Ketiganya wajib, tidak boleh ada yang dilewati.

### Field-Level Permission
Data berikut hanya terlihat oleh pemilik permission khusus:
```text
harga beli material      → purchase.view_cost
margin & profit          → costing.view_margin
gaji & upah              → payroll.view
audit trail lengkap      → audit.view_all
data pajak               → tax.view
```

### Pemisahan Tugas (Segregation of Duties) — DETAIL IMPLEMENTASI

**Aturan inti:** sistem menolak transaksi jika user yang membuat draft (**Creator**) mencoba menyetujui atau mem-posting transaksi yang sama (**Approver**).

```text
Pemeriksaan dilakukan di service layer, SEBELUM query approve/post dijalankan:

  IF document.created_by == current_user.id
     AND action IN ('approve', 'post')
     AND document.requires_sod_check == true
  THEN reject → error code SOD_VIOLATION
```

Implementasi teknis:
```text
1. Setiap tabel dokumen menyimpan created_by DAN approved_by/posted_by terpisah.
2. Middleware/guard SoD berjalan di layer service, bukan di frontend —
   supaya tidak bisa dilewati lewat panggilan API langsung.
3. Guard SoD berlaku pada pasangan aksi berikut (minimum):
```

| Aksi Dibuat Oleh | Tidak Boleh Disetujui/Diposting Oleh Orang yang Sama |
|---|---|
| Draft Invoice | Post Invoice (di atas threshold) |
| Draft Credit Note | Approve Credit Note |
| Draft Stock Opname | Approve Stock Adjustment |
| Draft Purchase Order | Approve Purchase Order (di atas threshold) |
| Draft Supplier Payment | Approve Supplier Payment |
| Draft Journal manual | Post Journal |
| Input Acceptance | Approve perubahan Price List |

```text
4. Threshold nilai (di bawah mana SoD tidak wajib, misal transaksi kecil)
   disimpan di configuration, bukan hardcode.
5. Percobaan pelanggaran SoD (ditolak sistem) TETAP dicatat di audit_logs
   dengan action = 'SOD_VIOLATION_ATTEMPT' — ini sinyal penting untuk investigasi.
```

**Test wajib:** `SecurityTest::test_creator_cannot_approve_own_document()` — dan sebaliknya, pastikan user LAIN dengan permission yang benar **tetap bisa** approve, supaya guard ini tidak menghalangi kerja normal.

### Field-Level Security & Masking — DETAIL IMPLEMENTASI

**Aturan inti:** `avg_cost` (harga pokok beli material) dan seluruh angka margin/profit disembunyikan dari tampilan user yang bukan Owner.

```text
Implementasi WAJIB di response layer (API Resource / Serializer),
BUKAN hanya disembunyikan di frontend:

  class MaterialResource {
      toArray(user) {
          data.name = material.name
          data.stock_qty = material.stock_qty
          IF user.hasPermission('cost.view'):
              data.avg_cost = material.avg_cost
              data.total_value = material.total_value
          ELSE:
              // field tidak dikirim sama sekali, bukan di-null-kan
              // (null masih bocor lewat network tab browser)
  }
```

Field yang wajib mengikuti pola masking ini:
```text
materials.avg_cost, materials.total_value
job_costs.*_cost, job_costs.gross_profit, job_costs.gross_margin_percent
purchase_order_lines.unit_price   (untuk role yang hanya boleh lihat status PO)
worker_rates.rate_per_unit        (dari worker lain / role non-payroll)
monthly_salaries.*
```

Aturan tambahan:
```text
1. Field sensitif TIDAK BOLEH dikirim ke response JSON sama sekali
   jika user tidak berhak — jangan andalkan CSS/JS "sembunyikan" di frontend.
2. Export laporan (Excel/PDF) mengikuti aturan masking yang sama persis.
3. Percobaan akses field sensitif via endpoint langsung (misal id spesifik)
   tetap ditolak oleh permission check, bukan hanya di endpoint listing.
4. Log setiap akses ke laporan margin/profit oleh siapa pun (termasuk Owner)
   untuk keperluan audit.
```

**Test wajib:** `SecurityTest::test_non_owner_response_excludes_cost_fields()` — assert bahwa key `avg_cost` **tidak ada** di JSON response, bukan hanya bernilai kosong.

---

## 4. PERLINDUNGAN DATA

### Saat Transit
```text
HTTPS/TLS 1.2+ wajib, HTTP dialihkan otomatis
HSTS aktif (max-age minimal 1 tahun)
Sertifikat diperbarui otomatis
```

### Saat Disimpan
```text
Enkripsi disk/volume database
Kolom sensitif (mfa_secret, token) dienkripsi di level aplikasi
Backup dienkripsi sebelum dikirim off-site
Password hanya sebagai hash, tidak pernah plaintext
```

### Data Pribadi (UU PDP)
```text
Data pribadi  : nama, telepon, email, alamat, NPWP karyawan & kontak customer
Minimalisasi  : jangan kumpulkan data yang tidak dipakai
Akses         : hanya role yang butuh
Retensi       : sesuai kebutuhan bisnis & pajak (dokumen pajak 10 tahun)
Penghapusan   : nonaktifkan, jangan hapus data yang terkait transaksi
Log akses     : pencarian data customer tercatat
```

---

## 5. KEAMANAN APLIKASI

### Validasi Input
```text
Whitelist, bukan blacklist
Validasi di backend untuk SETIAP field, termasuk yang readonly di UI
Batasi panjang string, rentang angka, dan format tanggal
Tolak nilai negatif pada quantity dan amount kecuali memang diizinkan
```

### SQL Injection
```text
Wajib parameterized query / query builder
Raw query hanya untuk laporan, dengan parameter binding
Larang string concatenation untuk membangun SQL
```

### XSS
```text
Escape semua output
Content-Security-Policy ketat (tanpa inline script)
Sanitasi field rich text (notes) jika ada
```

### CSRF
```text
Token CSRF untuk semua form berbasis session
SameSite=Strict pada cookie
API berbasis token: verifikasi Origin/Referer
```

### Upload File
```text
Whitelist ekstensi   : jpg, jpeg, png, pdf, xlsx, csv, docx
Validasi MIME asli   : cek magic bytes, bukan hanya ekstensi
Ukuran maksimal      : 10 MB (configurable)
Nama file            : ganti jadi UUID, jangan pakai nama asli
Penyimpanan          : di luar webroot / object storage
Eksekusi             : direktori upload tanpa hak eksekusi
Akses                : lewat endpoint ber-permission, bukan URL publik
Scan                 : antivirus bila memungkinkan
```

### HTTP Header Wajib
```text
Strict-Transport-Security · X-Content-Type-Options: nosniff
X-Frame-Options: DENY · Content-Security-Policy
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy (matikan fitur yang tidak dipakai)
```

### Rate Limiting
```text
Login          : 10 / menit / IP
API umum       : 120 / menit / user
Export laporan : 10 / jam / user
Upload         : 60 / jam / user
```

---

## 6. INTEGRITAS TRANSAKSI

Ini bagian keamanan yang paling sering diabaikan, padahal paling mahal akibatnya.

```text
✓ Setiap posting akuntansi/stok/custody dalam SATU database transaction
✓ Idempotency-Key pada POST agar klik ganda tidak membuat dokumen dua kali
✓ Optimistic locking (kolom version) agar dua user tidak saling menimpa
✓ SELECT ... FOR UPDATE saat mengambil nomor dokumen
✓ Validasi balance jurnal sebelum commit; tidak balance → rollback total
✓ Periode LOCKED ditolak di level service DAN trigger database
✓ Posted document: UPDATE/DELETE ditolak di aplikasi DAN database
```

---

## 7. AUDIT TRAIL — IMMUTABLE / APPEND-ONLY (DETAIL IMPLEMENTASI)

**Aturan inti:** setiap aksi sensitif (`POST`, `CANCEL`, `REVERSAL`, dan seluruh daftar di bawah) tercatat otomatis ke `audit_logs` tanpa ada satu pun jalur di sistem untuk mengubah atau menghapusnya.

### Yang Wajib Dicatat Otomatis
```text
Login berhasil & gagal · logout · percobaan SoD violation
Perubahan master data · perubahan harga · perubahan tax master
Pembuatan, POST, CANCEL, REVERSAL semua dokumen
Approval · perubahan permission & role
Stock adjustment · custody adjustment
Posting & reversal jurnal · buka/tutup periode
Export data · akses laporan sensitif (margin, gaji)
Upload & hapus attachment
```

### Mekanisme Pencatatan (jangan andalkan disiplin developer semata)
```text
Lapis 1 — Application Event Listener:
  Setiap service yang melakukan POST/CANCEL/REVERSAL WAJIB memicu
  event (mis. DocumentPosted, DocumentCancelled) yang didengarkan
  oleh AuditLogListener secara otomatis. Developer tidak menulis
  kode audit manual di setiap tempat — mengurangi risiko lupa.

Lapis 2 — Database Trigger (jaring pengaman kedua):
  Trigger AFTER UPDATE pada kolom `status` di tabel dokumen utama
  (invoices, journals, work_orders, dst) menulis ke audit_logs
  meskipun perubahan status terjadi lewat jalur selain aplikasi
  (mis. saat maintenance darurat via database client).
```

### Membuat Tabel Benar-Benar Tidak Bisa Diubah (Database Level)

```sql
-- 1. Role aplikasi TIDAK punya hak UPDATE/DELETE ke audit_logs
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
GRANT INSERT, SELECT ON audit_logs TO app_user;

-- 2. Trigger penolak eksplisit (jaring pengaman ketiga —
--    aktif walau suatu saat GRANT di atas berubah tanpa sengaja)
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only, operation % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- 3. (Opsional, level lanjut) kirim salinan audit_logs secara real-time
--    ke penyimpanan terpisah (write-once object storage / log server
--    eksternal) sehingga walau database utama diretas total,
--    jejak audit tetap ada di tempat lain.
```

### Format
```text
user_id · timestamp · entity_type · entity_id · action
old_value (JSONB) · new_value (JSONB) · reason · ip_address · user_agent
```

### Sifat
```text
Append-only, ditegakkan di 3 lapis: aplikasi, GRANT database, trigger database
Disimpan minimal 5 tahun (dokumen pajak: 10 tahun)
Tidak dapat dinonaktifkan oleh siapa pun lewat UI, termasuk Owner
Hanya Owner yang dapat melihat audit lengkap; role lain melihat sebagian sesuai modul
Direplikasi ke penyimpanan terpisah secara berkala sebagai lapis pertahanan tambahan
```

**Test wajib:** `SecurityTest::test_audit_log_cannot_be_updated_or_deleted()` — coba UPDATE/DELETE langsung ke tabel dan pastikan database menolak (bukan hanya aplikasi).

---

## 7B. KEAMANAN INFRASTRUKTUR & JARINGAN (agar tidak mudah dibobol)

Bagian ini menjawab langsung kebutuhan: sistem dan database tahan terhadap upaya pembobolan dari luar.

### Topologi Jaringan
```text
Internet
   │
   ▼
[ Firewall / Security Group ]  ← hanya port 443 (HTTPS) & 22 (SSH, dibatasi IP) terbuka
   │
   ▼
[ Reverse Proxy / WAF (Nginx + ModSecurity, atau Cloudflare) ]
   │
   ▼
[ Application Server ]  ← private subnet, TIDAK punya IP publik langsung
   │
   ▼
[ Database Server ]     ← private subnet terpisah, HANYA menerima
                            koneksi dari Application Server, port
                            database TIDAK boleh terbuka ke internet
```

**Aturan wajib:**
```text
1. Database TIDAK PERNAH memiliki IP publik atau port terbuka ke internet.
   Satu-satunya jalur masuk ke database adalah dari server aplikasi.
2. SSH ke server:
   - Login dengan password DIMATIKAN, hanya SSH key
   - Root login langsung DIMATIKAN
   - Port SSH default (22) diganti port lain
   - Dibatasi hanya dari IP kantor/VPN, bukan dari mana saja
   - fail2ban aktif: 5 kali gagal → blokir IP 1 jam
3. Firewall (security group / iptables / ufw):
   - Deny by default, whitelist per port yang benar-benar dipakai
   - Port database, Redis, dan port internal lain TIDAK terbuka ke luar
4. VPN wajib untuk akses administratif (server, database client, staging)
   — jangan buka port administratif langsung ke internet demi kemudahan.
```

### Web Application Firewall (WAF) & Anti-DDoS
```text
Fungsi   : menyaring serangan umum (SQLi, XSS, bot, request abnormal)
           SEBELUM mencapai aplikasi
Opsi     : Cloudflare (gratis/murah, sekaligus anti-DDoS) atau
           ModSecurity + OWASP Core Rule Set di Nginx
Manfaat  : lapisan pertahanan tambahan di luar kode aplikasi —
           menahan serangan yang belum sempat ditambal di kode
```

### Pengerasan Server (Server Hardening)
```text
1. OS selalu mendapat patch keamanan — jadwalkan rutin (mingguan/bulanan),
   jangan menunggu insiden.
2. Nonaktifkan service yang tidak dipakai (matikan apa pun selain
   yang dibutuhkan aplikasi berjalan).
3. Aplikasi berjalan sebagai user non-root, bukan root.
4. Jika memakai container (Docker):
   - Image dasar minimal (distroless/alpine), bukan image umum yang besar
   - Container berjalan sebagai non-root user
   - Image dipindai kerentanan sebelum deploy (Trivy/Grype)
   - Read-only filesystem untuk container kecuali direktori yang memang perlu tulis
5. Direktori upload TIDAK memiliki hak eksekusi (noexec) —
   walau ada file berbahaya ter-upload, ia tidak bisa dijalankan sebagai skrip.
```

### Manajemen Rahasia (Secrets Management)
```text
1. Kredensial (password DB, API key, JWT secret) TIDAK PERNAH masuk ke
   repository kode, bahkan di riwayat commit lama.
2. Simpan di secret manager (AWS Secrets Manager, HashiCorp Vault,
   atau minimal environment variable server yang tidak ter-commit).
3. Rotasi kredensial database & API key secara berkala (minimal per tahun,
   segera setelah ada staf/developer yang keluar).
4. .env dan file konfigurasi sensitif masuk .gitignore sejak commit pertama.
```

### Pemindaian Dependensi (Supply Chain Security)
```text
Backend (PHP)   : composer audit dijalankan otomatis di CI setiap build
Frontend (JS)   : npm audit / pnpm audit dijalankan otomatis di CI
Container image : Trivy/Grype scan sebelum image di-deploy
Kebijakan       : build GAGAL jika ditemukan kerentanan level HIGH/CRITICAL
                  pada dependency yang benar-benar dipakai di production
Pembaruan       : Dependabot/Renovate aktif untuk pembaruan otomatis
                  library dengan patch keamanan
```

### Monitoring & Deteksi Dini
```text
1. Log terpusat (semua server & aplikasi ke satu tempat) agar pola
   serangan bisa terlihat lintas komponen, bukan tersebar di tiap server.
2. Alert otomatis untuk:
   - Lonjakan login gagal dari satu IP/rentang IP
   - Percobaan akses endpoint admin dari IP tidak dikenal
   - Penggunaan CPU/traffic tidak wajar (indikasi serangan atau cryptomining
     jika server sempat disusupi)
   - Perubahan pada file inti aplikasi di luar proses deployment normal
3. File Integrity Monitoring (opsional, level lanjut) pada direktori kode
   inti — mendeteksi jika ada file diubah di luar deployment resmi
   (indikasi backdoor/web shell).
```

---

## 7C. KEAMANAN DATABASE SECARA KHUSUS

### Prinsip Least Privilege di Database
```sql
-- Aplikasi TIDAK boleh connect sebagai superuser/postgres.
-- Buat role khusus dengan hak terbatas:

CREATE ROLE app_user LOGIN PASSWORD '...' ;
GRANT CONNECT ON DATABASE sentanu_erp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- DELETE tidak diberikan secara umum — hanya pada tabel yang memang
-- butuh (draft), dikontrol lebih granular jika perlu.

-- Role terpisah untuk laporan, read-only:
CREATE ROLE report_user LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE sentanu_erp TO report_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO report_user;

-- audit_logs: seperti sudah dibahas, app_user hanya INSERT+SELECT,
-- tidak pernah UPDATE/DELETE.
```

### Koneksi Terenkripsi
```text
SSL/TLS wajib untuk koneksi aplikasi → database, walau berada dalam
jaringan privat yang sama — pertahanan berlapis jika jaringan internal
suatu saat tersusupi.

postgresql.conf : ssl = on
pg_hba.conf     : hostssl (bukan host biasa) untuk semua entri
```

### Row-Level Security untuk Isolasi Branch (opsional, level lanjut)
```sql
-- Mencegah bug di application layer secara tidak sengaja
-- menampilkan data branch lain, sebagai lapis pertahanan tambahan
-- di ATAS scoping yang sudah dilakukan di kode aplikasi:

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY branch_isolation ON invoices
  USING (branch_id = current_setting('app.current_branch_id')::uuid);
```

### Perlindungan dari SQL Injection (penegasan)
```text
Wajib parameterized query / ORM query builder di 100% kode.
Raw SQL HANYA untuk laporan kompleks, dengan parameter binding —
TIDAK PERNAH menggabungkan string input user langsung ke query.
Code review WAJIB menolak PR yang mengandung string concatenation ke SQL.
```

### Audit Ekstensi Database (opsional, level lanjut)
```text
pgAudit (ekstensi PostgreSQL) dapat mencatat setiap statement SQL
yang dijalankan di level database — lapisan audit tambahan di luar
audit_logs aplikasi, berguna untuk investigasi forensik jika terjadi insiden.
```

---

## 7D. PERLINDUNGAN TERHADAP VIRUS / MALWARE / RANSOMWARE

### Pemindaian File Upload
```text
Setiap file yang diunggah user (foto STB, foto QC, dokumen) WAJIB
dipindai antivirus SEBELUM disimpan permanen, bukan hanya divalidasi
tipe/ekstensinya.

Alur:
  User upload → simpan sementara (quarantine) → scan (ClamAV)
  → BERSIH: pindah ke storage permanen, LOG hasil scan
  → TERINFEKSI: tolak, hapus, catat audit_logs, beri tahu user

Validasi tambahan yang tetap berlaku:
  - Cek magic bytes file (isi sebenarnya), bukan hanya ekstensi nama file
  - Ukuran maksimal
  - Tidak disimpan dengan nama asli (ganti UUID)
  - Direktori penyimpanan tidak memiliki hak eksekusi
```

### Perlindungan Ransomware pada Backup
```text
Ancaman utama ransomware bukan hanya mengunci data produksi, tapi juga
MENGHAPUS backup yang bisa dijangkau server yang sama.

Wajib:
  1. Backup disimpan di tempat yang TIDAK BISA dihapus oleh server produksi
     — kredensial backup terpisah total, server produksi hanya punya
     hak TULIS (upload), tidak punya hak HAPUS ke arsip backup.
  2. Gunakan penyimpanan immutable/write-once bila tersedia
     (Object Lock di S3/MinIO, atau layanan setara).
  3. Minimal satu salinan backup benar-benar offline/air-gapped
     atau di penyedia yang berbeda dari hosting utama.
  4. Restore test rutin memastikan backup benar-benar bisa dipakai,
     bukan hanya "ada file"-nya.
```

### Kebersihan Lingkungan Server
```text
1. Antivirus/anti-malware di level server jika hosting mengizinkan.
2. Semua software pihak ketiga di server hanya yang benar-benar perlu —
   permukaan serangan berbanding lurus dengan jumlah software terpasang.
3. Email/link mencurigakan yang mengarah ke akses server: SOP internal
   melarang klik link tidak dikenal dari akun yang punya akses server.
4. Segmentasi: staging TIDAK memakai kredensial atau koneksi yang sama
   dengan production, agar kompromi di satu sisi tidak menjalar ke sisi lain.
```

---

## 8. BACKUP & PEMULIHAN

```text
Frekuensi   : harian otomatis, ditambah sebelum setiap deployment
Jenis       : full harian + WAL/incremental (point-in-time recovery)
Lokasi      : minimal 2 lokasi, salah satunya di luar kantor
Enkripsi    : wajib, kunci disimpan terpisah dari backup
Retensi     : 30 hari harian · 12 bulan bulanan · 7 tahun tahunan
Uji restore : setiap kuartal, hasilnya didokumentasikan
RPO / RTO   : ≤ 24 jam / ≤ 8 jam
```

> **Backup yang belum pernah diuji restore dianggap tidak ada.**

### Perlindungan Ransomware
```text
Backup immutable / write-once bila tersedia
Kredensial backup terpisah dari kredensial server
Server tidak boleh punya akses hapus ke arsip backup
```

---

## 9. KEAMANAN OPERASIONAL

### Onboarding
```text
1. Owner menyetujui pembuatan akun
2. Akun dibuat dengan role minimal
3. Password sementara, wajib ganti saat login pertama
4. Training termasuk materi keamanan dasar
```

### Offboarding (wajib di hari terakhir)
```text
1. Nonaktifkan akun (jangan hapus — data transaksi harus tetap tertaut)
2. Cabut semua refresh token
3. Ganti kredensial bersama yang mungkin diketahui
4. Tinjau audit log 30 hari terakhir
```

### Tinjauan Berkala
```text
Bulanan   : tinjau login gagal & aktivitas mencurigakan
Kuartalan : tinjau daftar user & permission; uji restore backup
Tahunan   : tinjau seluruh kebijakan keamanan
```

### Akses Pengembang ke Production
```text
Hanya melalui akun terpisah dengan MFA
Tidak boleh memakai data production untuk pengembangan tanpa anonimisasi
Setiap akses tercatat
Perubahan data langsung di database dilarang kecuali insiden, dengan persetujuan Owner tertulis
```

---

## 9B. TESTING & DEBUGGING PROTOCOL (DETAIL IMPLEMENTASI)

### Unit Testing Backend (PHPUnit)

Test keamanan dan business-critical **wajib hijau** sebelum merge, dijalankan otomatis di CI setiap push:

```php
// TaxEngineTest — wajib menutup 3 kondisi pajak yang dikunci di Master Prompt
class TaxEngineTest extends TestCase {
    public function test_kondisi_1_tanpa_pajak() {
        // PPN 0%, PPh 0%, total = harga jual dasar
    }
    public function test_kondisi_2_kena_ppn() {
        // PPN 11% + PPh 2%, base dari Tax Master bukan hardcode
    }
    public function test_kondisi_3_hanya_pph() {
        // PPN 0%, PPh 2.5%
    }
    public function test_rate_diambil_dari_master_bukan_kode() {
        // ubah tax_rates di DB, pastikan hasil hitung ikut berubah
    }
    public function test_harga_historis_tidak_berubah_saat_rate_diubah() {
        // invoice lama tetap pakai rate lama (snapshot)
    }
}

// SecurityTest — menutup aturan keamanan di Bagian 3 & 7
class SecurityTest extends TestCase {
    public function test_creator_cannot_approve_own_document() { }
    public function test_different_user_with_permission_can_approve() { }
    public function test_non_owner_response_excludes_cost_fields() { }
    public function test_audit_log_cannot_be_updated_or_deleted() { }
    public function test_sod_violation_attempt_is_logged() { }
    public function test_posted_document_cannot_be_deleted() { }
    public function test_journal_must_be_balanced_or_rejected() { }
    public function test_locked_period_rejects_new_posting() { }
    public function test_permission_denied_returns_403_not_500() { }
    public function test_sql_injection_attempt_is_neutralized() { }
    public function test_uploaded_file_with_malicious_content_is_rejected() { }
}
```

**Target cakupan:** ≥ 90% untuk domain layer, **100%** untuk `TaxEngine` dan `SecurityTest` — dua area ini tidak boleh punya baris kode tak teruji.

### Frontend Type-Check & Build

Wajib **lulus 0 error** sebagai syarat mutlak sebelum deploy, dijalankan di CI:

```bash
tsc -b && vite build
```

```text
Aturan tambahan:
- strict: true di tsconfig.json — tidak boleh ada `any` diam-diam
- ESLint dengan rule keamanan (no-eval, no-unsafe-innerHTML) wajib lulus
- Build gagal → deployment otomatis dibatalkan, tidak ada jalan pintas
```

### Clean Error & Debugging Protocol

**Aturan inti:** sistem produksi tidak pernah membocorkan detail internal (SQL, stack trace, path server) ke pengguna, tetapi tetap mencatat detail lengkap untuk developer.

```text
LINGKUNGAN PRODUCTION:
  APP_DEBUG = false  (WAJIB, tidak ada pengecualian)

  User menerima:
    { "error": { "code": "INTERNAL_ERROR",
                 "message": "Terjadi kesalahan pada sistem. Tim kami sudah diberi tahu.",
                 "trace_id": "01JD8X..." } }

  Server mencatat (TIDAK dikirim ke user):
    Full stack trace, SQL query yang gagal, parameter request,
    user_id, timestamp — disimpan di log server, dikaitkan dengan
    trace_id yang sama agar developer bisa menelusuri dari trace_id
    yang dilaporkan user.

LINGKUNGAN DEVELOPMENT/STAGING:
  APP_DEBUG = true diperbolehkan — stack trace lengkap boleh tampil
  untuk mempercepat debugging, karena tidak ada data customer nyata.
```

```text
Larangan eksplisit di production:
  ❌ Pesan error menampilkan nama tabel/kolom database
  ❌ Pesan error menampilkan query SQL yang dijalankan
  ❌ Pesan error menampilkan path file server (/var/www/app/...)
  ❌ Pesan error menampilkan versi framework/library
  ❌ HTTP response header membocorkan teknologi (X-Powered-By dimatikan)
```

**Test wajib:** `test_production_error_response_excludes_stack_trace()` — pastikan response error di mode production tidak mengandung kata kunci seperti nama tabel, "SQLSTATE", atau path absolut.

---

## 10. CHECKLIST SEBELUM GO-LIVE

```text
[ ] HTTPS aktif, HTTP dialihkan, HSTS menyala
[ ] Seluruh password default diganti
[ ] Akun demo/test dihapus dari production
[ ] Debug mode MATI, pesan error tidak membocorkan stack trace
[ ] Rate limiting aktif
[ ] Security header terpasang lengkap
[ ] Upload file tervalidasi & tersimpan di luar webroot
[ ] Permission diuji per role (uji juga yang seharusnya DITOLAK)
[ ] Segregation of duties diuji
[ ] Audit trail terbukti tidak bisa diubah
[ ] Posted document terbukti tidak bisa dihapus
[ ] Posting ke periode terkunci terbukti ditolak
[ ] Backup otomatis berjalan & restore test BERHASIL
[ ] Kredensial ada di secret manager, bukan di repo
[ ] Dependensi dipindai (tidak ada kerentanan kritis)
[ ] Penetration test dasar / OWASP Top 10 review
[ ] Log terpusat & monitoring aktif
[ ] Prosedur insiden tertulis & diketahui Owner
[ ] MFA aktif untuk Owner

--- Infrastruktur & Database (BARU) ---
[ ] Database TIDAK memiliki IP publik / port tertutup dari internet
[ ] SSH: password login mati, key-only, root login mati, fail2ban aktif
[ ] Firewall deny-by-default, hanya port yang dipakai yang terbuka
[ ] WAF aktif (Cloudflare / ModSecurity)
[ ] Database app_user BUKAN superuser, hak dibatasi sesuai kebutuhan
[ ] Koneksi aplikasi→database memakai SSL/TLS
[ ] Kredensial & secret di secret manager, bukan di kode/repo
[ ] composer audit & npm audit lulus tanpa kerentanan HIGH/CRITICAL
[ ] Container (jika dipakai) non-root, image sudah di-scan
[ ] Backup memakai kredensial terpisah, tidak bisa dihapus dari server produksi
[ ] Minimal satu salinan backup offline/di penyedia berbeda
[ ] Antivirus scan aktif untuk semua file upload (ClamAV atau setara)
[ ] audit_logs terbukti menolak UPDATE/DELETE di level database (trigger + GRANT)
[ ] APP_DEBUG = false di production, dikonfirmasi langsung di server
[ ] tsc -b && vite build lulus 0 error di pipeline CI
[ ] TaxEngineTest & SecurityTest 100% hijau di CI
[ ] Uji SoD: user pembuat draft terbukti DITOLAK saat approve dokumen sendiri
[ ] Uji masking: response API untuk role non-Owner terbukti TIDAK mengandung avg_cost/margin
```

---

## 11. PROSEDUR INSIDEN

```text
1. DETEKSI    — siapa pun yang menemukan segera lapor ke Owner
2. ISOLASI    — nonaktifkan akun terdampak, cabut token, jika perlu putus akses eksternal
3. NILAI      — data apa yang terdampak, sejak kapan, berapa luas (baca audit log)
4. PULIHKAN   — restore dari backup bersih bila diperlukan
5. DOKUMEN    — catat kronologi, penyebab, tindakan
6. PERBAIKI   — tutup celah agar tidak berulang
7. LAPOR      — bila ada kebocoran data pribadi, ikuti kewajiban UU PDP
```

Kontak darurat (isi saat go-live): Owner · Developer/Vendor · Penyedia hosting.
