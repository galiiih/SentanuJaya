# Open Decision Register — RESOLVED

Jawaban Owner diterima 2026-09-23. Dokumen ini menjadi keputusan final.

## 1. Status PKP
**RESOLVED**: Sudah PKP. Menggunakan Coretax DJP. Tanggal PKP dikonfirmasi kemudian (bukan blocker MVP-1). Simpan `is_pkp`, `pkp_date` nullable di `companies`.

## 2. PPh Customer
**RESOLVED**: Dua kondisi:
- Tanpa PPN → PPh jasa **2,5%** dari DPP.
- Dengan PPN → PPh jasa **2%** dari DPP.

Tarif configurable via `tax_rules` + `tax_rates`. Jangan hardcode. Ada kemungkinan typo pada dokumen contoh (Rp32.375 vs Rp323.750) — verifikasi dengan bukti potong asli sebelum production.

## 3. PPN Customer
**RESOLVED**: Harga price list = **harga sebelum pajak**. PPN ditambahkan jika customer/transaksi menggunakan PPN. Tiga kondisi pajak customer:
- Kondisi 1: tanpa PPN, tanpa PPh.
- Kondisi 2: tanpa PPN, PPh 2,5%.
- Kondisi 3: PPN + PPh 2%.

Tax rate configurable. Jangan hardcode 11% atau 12%.

## 4. Pendapatan / Invoice
**RESOLVED**: Revenue diakui setelah: Delivered + Customer Acceptance = OK. Invoice hanya untuk barang yang sudah acceptance OK. Reject bukan revenue. Flow:
`Customer PO → Barang Masuk → Production → QC → Surat Jalan → Customer Acceptance → Invoice → Payment`.

## 5. Acceptance
**RESOLVED**: Yang menentukan OK/reject = **QC tim customer**, bukan Sentanu. Tidak ada tanda tangan wajib. Bukti = **copy Surat Jalan yang dikembalikan customer**. Simpan sebagai attachment. Field minimum: status OK/REJECT, tanggal, user input, catatan, attachment.

## 6. Harga
**RESOLVED**: Harga berbeda berdasarkan kombinasi **customer + item + warna + treatment + ukuran**. Admin boleh override. Override menyimpan: harga awal, harga override, alasan, user, waktu, approval Owner jika diperlukan.

Dampak schema: `price_list_lines` perlu kolom `size` nullable.

## 7. Invoice
**RESOLVED**: 1 Invoice → 1 Customer → banyak SJ. 1 SJ → 1 PO. 1 PO → banyak SJ. Tidak boleh lintas customer dalam satu invoice.

## 8. Pembayaran / DP
**RESOLVED**: MVP-1 tanpa DP. Metode: **Cash dan Bank Transfer**. Schema siapkan `down_payments` dan `payment_allocations` untuk future. Payment + Payment Allocation pattern.

## 9. Barang customer rusak/hilang
**RESOLVED**: Custody, bukan inventory. Jika customer melaporkan kurang → rekonsiliasi dulu (STB, produksi, SJ, kemungkinan produksi berlebih/excess). Jika terbukti hilang → claim dengan approval Owner, ganti rugi berdasarkan **harga barang customer**. Audit trail wajib.

Dampak schema: `customer_items` perlu kolom `item_value` nullable (harga barang customer untuk claim). `customer_claims` masuk MVP-1 sebagai tabel sederhana.

## 10. Material
**RESOLVED**: Pembelian masuk stok. Batch dan expiry **tidak wajib MVP-1** — field nullable, disiapkan untuk future. Perputaran material cepat.

## 11. Pemakaian Material
**RESOLVED**: Dikaitkan dengan **Work Order/pekerjaan** agar cost terlacak. Input oleh **Admin**. Audit trail: user, tanggal, waktu, qty, material, WO.

Dampak MVP-1: meskipun WO penuh masuk MVP-2, MVP-1 tetap perlu `reference_type` + `reference_id` pada `material_usages` untuk mencatat pekerjaan terkait. Minimal reference ke customer PO atau nomor pekerjaan.

## 12. Gudang
**RESOLVED**: **1 lokasi** saat ini. `warehouse_id` disiapkan, tidak ditampilkan di UI MVP-1. Transfer antar lokasi tidak perlu MVP-1.

## 13. Stock Opname
**RESOLVED**:
- Monitoring minimum stock: otomatis harian.
- Review Admin: mingguan.
- Full stock opname: bulanan.
- Emergency check: jika ada selisih.
- Minimum stock berbeda per material.

## 14. Notifikasi Minimum Stock
**RESOLVED**: Penerima = **Admin**. Channel MVP-1 = **email + dashboard warning**. WhatsApp/Telegram/Owner → future.

## 15. Status Produksi
**RESOLVED**: MVP-1 menggunakan status sederhana:
`RAW → PAINT → DRYING → POLISH → QC → PACKING → READY_DELIVERY → DELIVERED`.
QC: OK atau REJECT. Reject → rework.

Dampak: custody stage enum harus mengikuti daftar ini.

## 16. Work Order
**RESOLVED**: 1 PO → banyak item → banyak WO → pengiriman bertahap.
Contoh: PO-001 → Body Kit 10 + Spoiler 5 + Cover 3.
SJ-001 → Body Kit 6. SJ-002 → Body Kit 4 + Spoiler 5. SJ-003 → Cover 3.

## 17. Transport
**RESOLVED**: Transport dapat dikaitkan ke customer/WO atau dicatat sebagai biaya umum. Tarif berdasarkan **jarak**, menggunakan **template tarif dari Owner**. Admin tidak input tarif manual setiap transaksi.

Dampak schema: tambah `transport_templates` (distance_range, tarif, effective_date, created_by).

## 18. Supplier / Pembelian
**RESOLVED**: MVP-1 cukup **Purchase Form** tanpa Supplier PO formal. Flow:
`Supplier → Purchase Form → Material Receipt → Stock`.
Data: supplier, tanggal, material, qty, harga/unit, total, payment status, attachment, notes.

## 19. Akuntansi
**RESOLVED**: MVP-1 **tanpa double-entry journal penuh**. Fokus laporan operasional:
Revenue, Expense, Cash, Bank, Receivable, Material Stock, Material Usage, Profit/Loss sederhana.
Schema siapkan agar journal dapat ditambahkan tanpa redesign.

## 20. Periode Pembukuan
**RESOLVED**: Operasional Senin–Sabtu, 08:00–17:00, Minggu tutup. Lembur bisa terjadi. Jam operasional **bukan hard restriction** — transaksi boleh dicatat di luar jam kerja. Periode laporan mingguan: Senin–Sabtu.

System start date dan tutup bulan pertama ditentukan menjelang go-live.

## 21. Cabang
**RESOLVED**: 1 workshop. `branch_id` disiapkan, tidak tampil di UI MVP-1. Auto-set branch default.

## 22. Tech Stack & Hosting
**RESOLVED**: Laravel 11 + React/Vite + Eloquent + PostgreSQL + Redis. Hosting: **VPS** (Hostinger KVM atau alternatif: BiznetGio, IDCloudHost). Spesifikasi awal: ~2 vCPU, 4–8 GB RAM. PostgreSQL dan Redis satu VPS dulu, pisah jika perlu.

## 23. Quotation
**RESOLVED**: **Tidak masuk MVP-1**. Customer PO langsung menjadi dasar pekerjaan.

## 24. Subkontrak
**RESOLVED**: Ada kemungkinan (chrome, repair, coating khusus). Berdasarkan PO customer, bukan vendor contract jangka panjang. MVP-1 tidak perlu Contract Management penuh. Siapkan tabel sederhana: subcontract vendor, service, cost, relasi ke WO/PO.

## 25. Data Awal
**RESOLVED**: Owner menyediakan data berikut sebelum go-live:
- Company info (nama, alamat, NPWP, PKP, bank)
- Customer (code, nama, alamat, kontak, NPWP, tax profile, payment term)
- Customer Item (code, nama, category, unit, ukuran, **item_value untuk claim**)
- Warna (code, nama)
- Treatment (code, nama)
- Material (code, nama, category, unit, min stock, opening stock, cost/unit, supplier)
- Supplier (code, nama, kontak, alamat)
- Employee/Worker (code, nama, role, tipe daily/monthly, tarif, salary)
- Price List (customer × item × warna × treatment × ukuran × harga × effective date)
- Tax Configuration (tax profile, PPN, PPh, rate, base, effective date)
- Transport Template (distance, tarif, effective date)
- Expense Category (listrik, transport, gaji, daily worker, material, subcontract, other)
- Opening Customer Custody (customer, PO, item, qty, color, condition, status, item value, foto)
- Opening Material Stock (material, qty, unit, cost/unit, total, warehouse)
- Existing Customer PO (jika masih berjalan)
- Existing WO/Production (jika ada pekerjaan berjalan)
- Existing Surat Jalan (belum acceptance)
- Outstanding Invoice (nomor, customer, tanggal, gross, PPN, PPh, net, paid, outstanding, status)
- Opening Cash & Bank (saldo kas, saldo bank, rekening)

## Status keputusan

```text
Semua 25 pertanyaan    : RESOLVED
Blocker coding MVP-1   : TIDAK ADA
Sisa konfirmasi minor  : tanggal PKP, verifikasi bukti potong PPh
```
