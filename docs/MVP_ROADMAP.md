# Roadmap MVP Sentanu ERP

## Prinsip
MVP pertama harus menjawab kerugian paling nyata: barang customer tidak terlacak, material tidak terkendali, pengiriman dan tagihan terlambat.

## MVP-1 — Operasional inti dan tagihan

**Tujuan:** admin dapat mencatat barang customer masuk, material, pemakaian, pengiriman, acceptance, invoice, dan pembayaran dasar.

### Modul
1. Login, user, role Admin/Owner, audit log dasar.
2. Master customer, supplier, item customer (+ item_value untuk claim), warna, treatment, material, satuan, price list (customer × item × warna × treatment × ukuran).
3. Penerimaan barang customer: STB, foto/kondisi, lokasi, custody balance.
4. Gudang material perusahaan: penerimaan material (Purchase Form, tanpa Supplier PO), batch nullable, stok, kartu stok, minimum stock.
5. Pemakaian material: quantity aktual, batch nullable, work reference (WO/PO), pengurangan stok atomik. Input oleh Admin.
6. Pengiriman: surat jalan bertahap, warna, quantity, status. 1 SJ = 1 customer + 1 PO. Partial delivery supported.
7. Customer acceptance: OK/reject (ditentukan QC customer), bukti = copy SJ yang dikembalikan (attachment), outstanding return.
8. Invoice: satu customer, banyak SJ, snapshot harga, status UNINVOICED/INVOICED. Tax configurable (3 kondisi pajak).
9. Pembayaran: Cash dan Bank Transfer. Payment + Payment Allocation. DP tidak masuk MVP-1, schema disiapkan.
10. Dashboard ringkas: custody di workshop, stok minimum + warning email Admin, SJ belum ditagih, piutang.
11. Status produksi sederhana: RAW → PAINT → DRYING → POLISH → QC → PACKING → READY_DELIVERY → DELIVERED.
12. Transport template: tarif berdasarkan jarak dari Owner.
13. Customer claim sederhana: rekonsiliasi custody → claim → approval Owner → ganti rugi berdasarkan item_value.
14. Opening data import: custody, material stock, existing PO/WO/SJ/invoice/cash/bank.

### Tidak masuk MVP-1
Daily payroll penuh, rework costing, AP lengkap, fixed asset, depresiasi, e-Faktur API, QR, WhatsApp, multi-branch transfer, quotation, DP, double-entry journal, breakdown 90/10, contract management subkontrak.

### Exit criteria
- STB menambah custody, tidak menambah inventory.
- Pemakaian material tidak bisa membuat stok negatif.
- Surat jalan tidak bisa melebihi custody balance.
- Revenue/invoice billable quantity tidak melebihi acceptance OK.
- Banyak SJ dapat digabung ke satu invoice.
- Posted transaction tidak dapat dihapus.
- Audit log tercatat.

## MVP-2 — Produksi dan biaya pekerjaan

Work Order, process stage, production QC, reject, rework, material allocation ke WO, upah harian, WIP, job costing, transport per pekerjaan, overhead sederhana.

## MVP-3 — Keuangan dan pembelian lengkap

Purchase Order, receipt, supplier invoice, AP aging, supplier payment, PPN Masukan, COA, journal event mapping, accounting period, P&L, neraca, rekonsiliasi.

## MVP-4 — Scale dan automation

Fixed asset/depresiasi, multi-branch penuh, import Excel, background report, notification email/WhatsApp, QR tracking, customer portal, mobile app.

## Urutan build MVP-1

1. Core auth/role/audit/document number.
2. Master data.
3. Custody inbound.
4. Material stock and usage.
5. Delivery and acceptance.
6. Invoice and payment.
7. Dashboard and reports.
8. UAT and migration data.
