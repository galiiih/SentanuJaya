# AI Agent Orchestration — Sentanu Jaya ERP

## Tujuan dan definisi

**ChatGPT adalah Main Orchestrator.** Istilah *orchestration* dalam project ini merujuk pada proses ChatGPT merencanakan pekerjaan, memecah task, mendelegasikan task kepada AI agent spesialis, mengumpulkan hasil, melakukan verifikasi independen, dan menentukan langkah berikutnya.

Ini **bukan** berarti project harus membangun framework orchestration khusus untuk menjalankan E2E test. E2E testing hanyalah salah satu jenis pekerjaan yang dapat didelegasikan kepada agent QA.

## Pembagian tanggung jawab

### 1. ChatGPT — Main Orchestrator
- Menjaga tujuan bisnis, blueprint, batas scope, dan keputusan yang sudah disetujui.
- Membuat task kecil dengan prasyarat, file/area yang boleh diubah, acceptance criteria, dan bukti yang harus diserahkan.
- Memilih agent yang sesuai dan menghindari task paralel yang saling mengubah file atau schema yang sama.
- Menggabungkan hasil, menyelesaikan konflik, memeriksa bukti, dan memutuskan apakah task lulus, perlu revisi, atau diblokir.
- Tidak menganggap laporan agent sebagai bukti tanpa memeriksa artefak yang tersedia.
- Tidak mengklaim test lulus jika hanya melihat test dibuat atau konfigurasi tersedia.

### 2. Coding / Implementation Agent
- Mengimplementasikan hanya scope yang diberikan.
- Menjelaskan file yang berubah, keputusan teknis, migrasi/data impact, dan risiko regresi.
- Menyediakan commit SHA/diff dan output test aktual.
- Tidak mengubah business rules atau blueprint tanpa persetujuan orchestrator.

### 3. QA / E2E Agent
- Menguji aplikasi berjalan melalui browser dan interaksi nyata (klik, ketik, navigasi, submit, reload).
- Melaporkan skenario, prasyarat, langkah reproduksi, expected vs actual, serta screenshot/video/log bila tersedia.
- Membedakan test yang hanya ditulis dari test yang benar-benar dijalankan.
- Memastikan CRUD diuji end-to-end; test typing harus membuktikan fokus input tidak hilang setelah setiap karakter.
- Membersihkan data uji dan membuktikan cleanup berhasil; kegagalan cleanup harus dilaporkan tanpa menutupi error utama.

### 4. Code Review / Security Agent
- Memeriksa diff aktual, authorization server-side, validasi, tenant/role boundaries bila relevan, data integrity, error handling, dan risiko regresi.
- Menyampaikan temuan berdasarkan path/baris kode, tingkat keparahan, dan rekomendasi.
- Tidak mengubah kode kecuali diberi task implementasi terpisah.

### 5. Research / Debug Agent
- Menyelidiki akar masalah dengan bukti dari kode, log, konfigurasi, dan reproduksi.
- Memberikan hipotesis yang dapat diuji dan urutan diagnosis.
- Tidak menyebut hipotesis sebagai root cause yang terkonfirmasi tanpa bukti.

## Siklus kerja standar

1. **Intake:** ChatGPT memastikan tujuan, scope, batasan bisnis, dan acceptance criteria.
2. **Plan:** ChatGPT memecah pekerjaan menjadi task independen dan menetapkan dependency.
3. **Delegate:** Setiap agent menerima instruksi spesifik, area kerja, larangan, dan format bukti.
4. **Execute:** Agent mengerjakan task dan mengembalikan artefak aktual.
5. **Verify:** ChatGPT memeriksa commit/diff, log, hasil browser/test, dan kecocokan dengan blueprint.
6. **Review:** Agent reviewer mengaudit perubahan bila risiko atau scope membutuhkannya.
7. **Fix loop:** Temuan dikembalikan sebagai task perbaikan yang terukur.
8. **Closeout:** ChatGPT menyatakan PASS, FAIL, atau BLOCKED per acceptance criterion, dengan bukti dan keterbatasan yang eksplisit.

## Kontrak hasil agent

Setiap agent harus melaporkan:
- Task dan acceptance criteria yang ditangani.
- Branch dan commit SHA yang tepat.
- File yang diubah dan ringkasan diff.
- Perintah yang benar-benar dijalankan, exit code, serta ringkasan output aktual.
- Test yang lulus/gagal/skip dan jumlahnya.
- Bukti browser atau log untuk klaim E2E.
- Data uji yang dibuat dan status cleanup.
- Temuan yang belum selesai, risiko, serta blocker.

Jika suatu hal tidak dijalankan, tulis **NOT RUN**. Jika tidak dapat diverifikasi, tulis **UNVERIFIED**. Dilarang membuat klaim PASS berdasarkan niat, konfigurasi, atau laporan tanpa bukti.

## Aturan koordinasi dan keselamatan perubahan

- Satu task implementasi memiliki satu agent pelaksana utama; hindari dua agent mengedit file yang sama bersamaan.
- Perubahan database, migrasi, tax logic, invoice/revenue rules, customer-owned custody, dan authorization harus mengikuti blueprint yang disetujui.
- Jangan menggabungkan atau deploy perubahan hanya karena build berhasil; pemeriksaan harus sesuai risiko dan acceptance criteria.
- Jangan melakukan force-push, menghapus data penting, mengubah secrets, atau menjalankan tindakan destruktif tanpa otorisasi eksplisit.
- Jangan mengarang commit, output terminal, screenshot, report, atau hasil CI.
- Bila konektor ChatGPT tidak memiliki akses untuk menjalankan agent atau browser, ChatGPT harus meminta hasil dari agent eksternal dan memverifikasinya; jangan mengklaim delegasi/eksekusi langsung yang tidak terjadi.

## Batas peran E2E

Playwright, browser automation, test fixtures, cleanup, dan laporan E2E adalah **tooling milik QA/testing**, bukan orchestrator utama project. Tidak perlu membuat custom E2E orchestration framework kecuali ada kebutuhan nyata yang disetujui. Nama branch atau dokumen yang menyebut orchestration sebaiknya menjelaskan apakah yang dimaksud adalah AI-agent coordination atau test execution.

## Status verifikasi

Dokumen ini menetapkan cara kerja dan tanggung jawab. Keberadaan dokumen ini sendiri **tidak membuktikan** bahwa agent eksternal telah dijalankan, E2E telah lulus, atau seluruh project telah diverifikasi. Status implementasi harus ditentukan dari commit, diff, dan bukti eksekusi aktual.
