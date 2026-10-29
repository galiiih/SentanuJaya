# Rekomendasi Akuntansi dan Perpajakan

## Status

Dokumen ini adalah rekomendasi desain sistem, bukan opini pajak final. Tarif, objek pajak, kode faktur, dan perlakuan transaksi harus dikonfirmasi konsultan pajak Sentanu Jaya sebelum production.

## Rujukan yang dipelajari

1. DJP — [PPN dan PMK 131 Tahun 2024](https://www.pajak.go.id/id/peraturan/perlakuan-pajak-pertambahan-nilai-atas-impor-barang-kena-pajak-penyerahan-barang-kena).
2. DJP — [PMK 11 Tahun 2025](https://www.pajak.go.id/sites/default/files/PMK%2011%20Tahun%202025.pdf).
3. DJP — [PPh Pasal 23](https://www.pajak.go.id/id/pemotongan-pajak-penghasilan-pasal-23).
4. IAI — [PSAK 72: Pendapatan dari Kontrak dengan Pelanggan](https://web.iaiglobal.or.id/PSAK-Umum/83).

Rujukan hukum dapat berubah. Sistem harus menyimpan effective date dan versi aturan, bukan hardcode angka.

## Rekomendasi akuntansi

### 1. Basis pencatatan

Gunakan double-entry accounting pada MVP-3. MVP-1 boleh memulai dari subledger operasional dan laporan kas/AR, tetapi struktur dokumen harus siap menghasilkan jurnal.

### 2. Pemisahan objek

- Barang customer: custody/off-balance-sheet, kuantitas dan lokasi saja.
- Material Sentanu: inventory, stock movement, batch, unit cost, dan moving average.
- Jasa painting/finishing: revenue service.
- Biaya material yang dipakai: cost pekerjaan/WIP.
- WIP: material, labor, dan overhead hanya aktif penuh mulai MVP-2.

### 3. Revenue

Gunakan konsep PSAK 72 sebagai rujukan desain: identifikasi kontrak, kewajiban pelaksanaan, harga transaksi, alokasi, lalu pengakuan saat kewajiban terpenuhi.

Untuk kebijakan operasional Sentanu:

- `DELIVERED` belum cukup untuk revenue.
- `ACCEPTANCE OK` menjadi bukti operasional utama.
- Revenue hanya sebesar quantity OK × harga snapshot.
- Accepted tetapi belum ditagih disimpan sebagai unbilled revenue pada MVP-3.
- Invoice tidak mengubah harga historis.

Jurnal target:

```text
Saat acceptance OK:
Dr Piutang Belum Ditagih
   Cr Pendapatan Jasa

Saat biaya pekerjaan dipindahkan:
Dr Beban Pokok Jasa
   Cr WIP Jasa

Saat invoice diposting:
Dr Piutang Usaha
   Cr Piutang Belum Ditagih
   Cr PPN Keluaran (jika berlaku)
```

Jurnal final perlu disetujui akuntan karena timing invoice, acceptance, dan pajak dapat berbeda.

### 4. Persediaan material

Gunakan moving average untuk MVP. Setiap material receipt memperbarui:

```text
new_avg_cost = (old_qty × old_avg_cost + receipt_qty × receipt_cost)
               / (old_qty + receipt_qty)
```

Material usage mengambil unit cost snapshot saat posting. Koreksi memakai reversal/adjustment, bukan edit saldo manual.

### 5. Pembelian

Pisahkan tiga kejadian:

1. Barang/material diterima.
2. Tagihan supplier diterima.
3. Pembayaran supplier dilakukan.

Jangan menyamakan penerimaan barang dengan pembayaran. AP lengkap masuk MVP-3.

### 6. P&L

P&L minimum:

```text
Pendapatan Jasa
- Beban Pokok Jasa
= Laba Kotor
- Beban Operasional
= Laba/Rugi Operasional
```

MVP-1 menampilkan pendapatan/tagihan/kas secara operasional. Jangan menyebutnya laporan laba-rugi final sebelum jurnal, WIP, accrual, dan periode akuntansi aktif.

## Rekomendasi pajak

### 1. Tax engine versioned

Simpan:

- tax code;
- jenis pajak;
- arah INPUT/OUTPUT/WITHHOLDING;
- dasar pengenaan pajak;
- rate;
- effective date dan expiry date;
- rounding method;
- legal reference;
- approval/audit.

### 2. PPN

Jangan mengunci aplikasi pada `PPN 11%` atau `PPN 12%`. DJP menjelaskan perubahan skema PPN sejak 2025, termasuk tarif 12% dan penggunaan DPP nilai lain 11/12 untuk kategori tertentu. Klasifikasi jasa Sentanu harus dikonfirmasi konsultan pajak.

Sistem harus menghitung berdasarkan tax rule customer dan tanggal transaksi. Invoice menyimpan snapshot DPP, rate, basis, dan hasil pajak.

### 3. PPh jasa

DJP menjelaskan PPh Pasal 23 untuk jasa tertentu sebesar 2% dari jumlah bruto, dengan ketentuan tarif lebih tinggi bila penerima tidak memiliki NPWP. Namun tidak semua jasa otomatis masuk PPh 23 dan klasifikasi jasa Sentanu harus divalidasi.

Sistem harus menyimpan:

- jenis PPh;
- dasar potong;
- tarif;
- pihak pemotong;
- nominal dipotong;
- nomor dan tanggal bukti potong;
- status expected/requested/received/verified/reconciled.

Jangan memakai label `PPh 2.5%` atau `PPh 2%` sebagai aturan universal tanpa tax rule resmi per customer/transaksi.

### 4. Faktur pajak

Status PKP menjadi keputusan wajib. Jika PKP, siapkan register NSFP dan data faktur manual pada MVP-3. Integrasi e-Faktur API ditunda.

### 5. Pembelian material

Simpan PPN Masukan dari supplier bila memenuhi syarat dokumen dan pengkreditan. Jangan otomatis mengkredit semua PPN pembelian tanpa verifikasi faktur pajak dan status supplier.

## Keputusan yang harus dikunci akuntan/pajak

1. Status PKP Sentanu.
2. Klasifikasi jasa painting/finishing untuk PPN.
3. Apakah customer tertentu memotong PPh 23, PPh final, atau tidak memotong.
4. Dasar potong yang benar untuk setiap jenis customer.
5. PPN atas uang muka.
6. Waktu penerbitan faktur pajak.
7. Perlakuan retur/rework/credit note.
8. Chart of Accounts final.
9. Treatment material yang langsung dibebankan versus masuk inventory.
10. Kebijakan revenue acceptance versus invoice.

## Rekomendasi implementasi

- MVP-1: tax configuration, tax snapshot invoice, withholding tracker sederhana; jangan mengklaim laporan pajak final.
- MVP-2: WIP dan job cost.
- MVP-3: journal, AP, PPN Masukan, PPh, faktur pajak, closing period, P&L final.
- Semua perubahan peraturan dilakukan melalui tax master versioning, bukan deploy kode.
