# API dan Wireframe MVP-1

## 1. API untuk apa?

API adalah jalur komunikasi terstruktur antara React frontend dan Laravel backend.

```text
Browser form → API request → Laravel validation/service → PostgreSQL → API response → UI
```

API diperlukan sejak MVP-1 karena:

- validasi dan permission tidak boleh hanya di browser;
- transaksi stok/custody harus berjalan atomik di server;
- React membutuhkan data dashboard dan tabel;
- mobile/portal masa depan dapat memakai layanan yang sama;
- audit, idempotency, dan error response harus terpusat.

API belum perlu dipublikasikan untuk pihak luar. MVP cukup memakai private authenticated API `/api/v1` di aplikasi yang sama.

## 2. Endpoint minimum MVP-1

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/me

GET/POST       /api/v1/customers
GET/PUT        /api/v1/customers/{id}
GET/POST       /api/v1/customer-items
GET/POST       /api/v1/materials
GET/POST       /api/v1/suppliers
GET/POST       /api/v1/price-lists

GET/POST       /api/v1/goods-receipts
POST           /api/v1/goods-receipts/{id}/submit
POST           /api/v1/goods-receipts/{id}/post
GET            /api/v1/custody-balances
GET            /api/v1/custody-ledger

GET/POST       /api/v1/material-receipts
POST           /api/v1/material-receipts/{id}/post
GET/POST       /api/v1/material-usages
POST           /api/v1/material-usages/{id}/post
GET            /api/v1/stocks
GET            /api/v1/stock-movements
POST           /api/v1/stock-opnames

GET/POST       /api/v1/delivery-orders
POST           /api/v1/delivery-orders/{id}/deliver
GET/POST       /api/v1/acceptances
POST           /api/v1/acceptances/{id}/post

GET            /api/v1/billing/eligible-deliveries
POST           /api/v1/invoices
POST           /api/v1/invoices/{id}/post
GET            /api/v1/invoices
GET/POST       /api/v1/payments
POST           /api/v1/payments/{id}/post

GET            /api/v1/dashboard/summary
GET            /api/v1/reports/stock
GET            /api/v1/reports/custody
GET            /api/v1/reports/ar
```

## 3. Wireframe MVP-1 — struktur layar

Wireframe ini menentukan informasi dan aksi. Visual final diputuskan setelah user review.

### Layout global

```text
┌────────────────────────────────────────────────────────────┐
│ Logo Sentanu Jaya     Search       Notif      User         │
├───────────────┬────────────────────────────────────────────┤
│ Dashboard     │ Breadcrumb                                 │
│ Master Data   │ Page title                 [+ Tambah]      │
│ Custody       │ Filters / date range / status               │
│ Gudang        │ Main content                                │
│ Pengiriman    │                                              │
│ Penagihan     │                                              │
│ Laporan       │                                              │
│ Pengaturan    │                                              │
└───────────────┴────────────────────────────────────────────┘
```

### Dashboard Owner/Admin

```text
┌────────────┬────────────┬────────────┬────────────┐
│ Custody    │ Stok kritis│ SJ belum   │ Piutang    │
│ workshop   │ material   │ ditagih    │ outstanding│
├────────────┴────────────┴────────────┴────────────┤
│ Grafik pengiriman / penerimaan / pembayaran         │
├───────────────────────────┬────────────────────────┤
│ Stok minimum               │ Tagihan jatuh tempo    │
└───────────────────────────┴────────────────────────┘
```

### Master Customer

```text
[+ Customer]
Search | Status | Pajak
┌Kode┬Nama┬NPWP/status pajak┬Price list┬Outstanding┬Aksi┐
└────┴────┴─────────────────┴──────────┴───────────┴────┘
```

Form: identitas, kontak, alamat tagihan/kirim, NPWP, status pajak, payment terms, credit limit, price list.

### Penerimaan Barang Customer / STB

```text
Header: nomor STB | tanggal/jam | customer | PO | pengantar | kendaraan
Lokasi custody: [select]
Lines: item | warna | qty | kondisi | kerusakan awal | foto
[Save Draft] [Submit QC] [Post]
```

### Custody Balance

```text
Filter customer | item | warna | lokasi | stage
┌Customer┬Item┬Warna┬Qty tersedia┬Lokasi┬Stage┬Umur┬Aksi┐
└────────┴────┴─────┴─────────────┴──────┴─────┴────┴────┘
```

### Gudang Material

```text
Tabs: Saldo Stok | Kartu Stok | Penerimaan | Pemakaian | Opname
┌SKU┬Material┬Batch┬Gudang┬Qty┬UoM┬Avg cost┬Min stock┬Status┐
└───┴────────┴─────┴──────┴───┴───┴────────┴─────────┴──────┘
```

Form pemakaian: tanggal, material, batch, qty, pekerjaan/reference, catatan, [Post]. Tampilkan saldo sebelum dan sesudah.

### Surat Jalan

```text
Header: nomor SJ | customer | PO | tanggal kirim | kendaraan | penerima
Lines: item | warna | qty kirim | harga snapshot | custody tersedia
Status badge: DRAFT / DELIVERED / ACCEPTANCE PENDING / ACCEPTED / INVOICED
[Deliver] [Input Acceptance]
```

### Acceptance

```text
SJ | tanggal terima | nama penerima | bukti/foto
Lines: item | qty kirim | qty OK | qty reject | alasan reject
[Post Acceptance]
```

### Invoice Builder

```text
Customer [select] | periode | tanggal invoice
Daftar SJ UNINVOICED:
[ ] SJ-001 20 unit | [ ] SJ-002 15 unit | [ ] SJ-003 10 unit
Preview lines | subtotal | diskon | DPP | PPN | PPh | total | terbilang
[Save Draft] [Post Invoice] [Print]
```

### Pembayaran

```text
Customer | invoice | tanggal | metode cash/bank | nominal | referensi
Alokasi ke invoice | saldo sebelum | nominal bayar | saldo sesudah
[Post Payment]
```

## 4. Aturan UI

- Tombol aksi mengikuti permission dan state.
- Posted document tampil read-only.
- Semua form menampilkan unit, saldo, dan validasi sebelum submit.
- Error API tampil sebagai pesan operasional yang jelas, bukan stack trace.
- Tablet workshop menjadi target utama; desktop mendukung laporan.
