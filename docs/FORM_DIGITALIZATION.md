# Pemetaan Form Fisik ke Modul Digital Web App (Update Lengkap V2.0)

Dokumen ini mencatat analisis pencatatan manual berbasis berkas fisik asli (PDF & foto) di bengkel pengecatan Sentanu Jaya dan bagaimana sistem ERP mengotomatisasi pencatatan.

---

## 📄 1. Kartu Stok (Stock Ledger)
- **Form Kertas**: Papan biru bertuliskan `NAMA BARANG`, `STOCK`, dengan kolom `NO`, `Tanggal`, `KETERANGAN`, `MASUK`, `KELUAR`, `SISA`.
- **Modul Digital**: `CustomerCustodyLedger` (untuk barang customer) & `StockBalance` / `MaterialLog` (untuk bahan baku).
- **Otomatisasi**:
  - `MASUK` diisi otomatis saat Surat Terima Barang (STB) diverifikasi.
  - `KELUAR` diisi otomatis saat Surat Jalan (SJ) diterbitkan.
  - `SISA` dihitung otomatis oleh transaction database (`balance = previousBalance + inQty - outQty`).

---

## 📄 2. Skedul Barang Masuk (Inbound Schedule & STB)
- **Form Kertas**: Form merah bertuliskan `TANGGAL`, `NO. PO`, `NAMA BARANG`, `QTT`, matriks tanggal penerimaan (`16-7`, `18-7`, dll), `TOTAL`, dan `OST`.
- **Modul Digital**: `InboundReceipt` (`STB`), `InboundReceiptLine`, `CustomerCustodyLedger`.
- **Otomatisasi**:
  - Input header PO (`NO. PO.`, `Target QTY`) 1 kali.
  - Setiap input Surat Terima Barang (STB) harian mencatat rincian `receivedQty` & foto kondisi fisik awal (`SCRATCH`, `DENT`, `OLD_PAINT`).
  - `TOTAL` dan `OST` (Outstanding / Sisa PO) di-update secara real-time.

---

## 📄 3. Skedul Pengiriman (Outbound Schedule & SJ)
- **Form Kertas**: Form pengiriman berbasis PO (`PGJP/26/881-R`), rincian nama barang otomotif (`FRONT BUMPER`, `OVER FENDER`, `BASE TURN LAMP`), `WARNA`, `QTY`, matriks tanggal kirim, `TOTAL`, dan `OST`.
- **Modul Digital**: `OutboundSchedule` (`Surat Jalan`), `OutboundScheduleLine`, `CustomerAcceptance`.
- **Otomatisasi**:
  - Pelacakan status: Memisahkan barang `OK` (syarat pengakuan revenue), `REJECT`, dan `RETURN_FROM_CUSTOMER`.
  - Akumulasi Sisa PO (OST): Jika pada akhir bulan terdapat `OST > 0`, sistem secara otomatis membawa nilai sisa tersebut ke periode bulan berikutnya tanpa rekap manual.

---

## 📄 4. DAFTAR TAGIHAN CUSTOMER (`DAFTAR TAGIHAN CUSTOMER.pdf`)
- **Form Fisik**: Tabel rekap Tagihan, Kwitansi, & e-Faktur Pajak.
- **Kolom Fisik**: `NO.`, `TANGGAL`, `NAMA CUSTOMER`, `NO. KWITANSI / INVOICE`, `NOMOR FAKTUR PAJAK`, `JUMLAH`, `KETERANGAN`.
- **Aturan pajak customer (mengikuti keputusan bisnis terbaru)**:
  - **Kondisi 1**: tanpa PPN dan tanpa PPh.
  - **Kondisi 2**: tanpa PPN, PPh jasa 2,5% dari DPP.
  - **Kondisi 3**: PPN dan PPh jasa 2% dari DPP.
  - Tarif PPN dan PPh harus berasal dari konfigurasi aturan pajak yang berlaku, bukan angka yang di-hardcode. Periksa effective date dan regulasi terkini sebelum transaksi production.
  - Contoh angka customer yang tercatat pada form lama adalah referensi historis, bukan dasar untuk menetapkan kondisi pajak. Cocokkan kondisi customer dan bukti potong asli sebelum menggunakannya.
- **Modul Digital**: `Invoice`, `NsfpRegister`, `WithholdingTaxCertificate`.

---

## 📄 5. PEMBELIAN SUPPLIER (`PEMBELIAN.pdf`)
- **Form Fisik**: `PT. SENTANU JAYA - DAFTAR BARANG MASUK (SUPPLIER)`.
- **Matriks Kategori Material**:
  - `CAT` (Lt), `EPOXY` (Lt), `3 M` (Lt), `COMBI` (Lt), `Compound` (Lt), `THINNER` (Lt), `PERNIS` (Lt), `DEMPUL` (Kg), `AMPLAS` (Lbr), `LAKBAN` (Roll), `LAIN2` (Tube/Pcs).
- **Modul Digital**: `PurchaseOrder`, `SupplierBill`, `MaterialBatch`, `Moving Average Costing`.

---

## 📄 6. BUKU KAS MANUAL & TRANSPORT (Foto Buku Ledger)
- **Form Fisik**: Buku Kas Tangan Harian.
- **Kolom Fisik**: `TGL.`, `KETERANGAN`, `DEBIT`, `KREDIT`, `SALDO`.
- **Item Transaksi Real**:
  - **Pemasukan Kas**: `Kas` / `Kas Bany` / `Otto` (+ Rp 350.000, + Rp 900.000).
  - **Operasional & Konsumsi**: `Beli air galon` (Rp 20.000), `Kompor` (Rp 157.000), `Beli Pangsit` (Rp 20.000).
  - **Bahan Baku Direct**: `Beli Dempul putih` (Rp 70.000).
  - **Transport & Bensin**: `Beli Bensin` (Rp 10.000 / Rp 20.000), `Yana (UB)`, `Yanto (DSP)`.
- **Modul Digital**: `PettyCash`, `FinancialTransaction`, `AccruedWages`.
