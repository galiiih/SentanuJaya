# State Machine — Sentanu ERP MVP-1

## Notasi

- `DRAFT`: masih boleh diedit.
- `SUBMITTED`: menunggu pemeriksaan/approval.
- `POSTED`: final; menghasilkan ledger/stok/jurnal sesuai modul.
- `CANCELLED`: dibatalkan dengan alasan; tidak dihapus.
- Setiap transisi wajib permission, audit log, dan idempotency.

## Customer PO

```text
DRAFT → CONFIRMED → PARTIALLY_RECEIVED → FULLY_RECEIVED
DRAFT/CONFIRMED/PARTIALLY_RECEIVED → CANCELLED
```

## Goods Receipt / STB

```text
Design:    DRAFT → SUBMITTED → QC_PENDING → QC_PASSED → POSTED
Phase 3:   DRAFT → SUBMITTED → POSTED  (QC steps deferred to MVP-2)
           DRAFT → CANCELLED
```

`POSTED` membuat `custody_ledger IN`. Tidak membuat `stock_movements` dan jurnal.

## Inbound QC

```text
DRAFT → POSTED(PASS)
DRAFT → POSTED(PARTIAL_PASS)
DRAFT → POSTED(REJECT)
```

Qty PASS masuk custody aktif. Qty REJECT tetap dicatat sebagai exception, tidak dianggap siap produksi.

## Material Receipt

```text
DRAFT → SUBMITTED → APPROVED → POSTED
DRAFT/SUBMITTED → CANCELLED
```

`POSTED` membuat batch/material stock movement IN. Koreksi memakai reversal.

## Material Usage

```text
DRAFT → SUBMITTED → APPROVED → POSTED
DRAFT/SUBMITTED → CANCELLED
```

`POSTED` mengunci unit cost snapshot, membuat stock movement OUT, dan menolak stok negatif. Jika accounting aktif, membuat jurnal WIP/expense.

## Work Order (MVP-2)

```text
DRAFT → RELEASED → IN_PROGRESS → QC_PENDING → COMPLETED
IN_PROGRESS/QC_PENDING → REWORK → QC_PENDING
DRAFT/RELEASED → CANCELLED
```

## Production QC (MVP-2)

```text
DRAFT → POSTED(PASS)
DRAFT → POSTED(REWORK)
DRAFT → POSTED(SCRAP)
```

## Delivery Order / Surat Jalan

```text
DRAFT → READY → DELIVERED → ACCEPTANCE_PENDING → ACCEPTED
DELIVERED → PARTIALLY_ACCEPTED
ACCEPTED/PARTIALLY_ACCEPTED → INVOICED
DRAFT/READY → CANCELLED
```

`DELIVERED` mengurangi custody OUT setelah validasi saldo. `INVOICED` hanya setelah qty accepted ditagihkan. Reject membuat outstanding return.

## Customer Acceptance

```text
DRAFT → SUBMITTED → POSTED(OK)
DRAFT → SUBMITTED → POSTED(PARTIAL)
DRAFT → SUBMITTED → POSTED(REJECT)
```

`POSTED` membuat revenue hanya untuk qty OK. Reject tidak menjadi revenue dan dapat membuat customer return.

## Invoice

```text
DRAFT → APPROVED → POSTED → PARTIALLY_PAID → PAID
POSTED/PARTIALLY_PAID → OVERDUE
POSTED/PARTIALLY_PAID/OVERDUE → CREDIT_NOTED/CANCELLED
```

Invoice hanya mengambil billable qty dari acceptance OK. Posted tidak diedit/dihapus.

## Payment

```text
DRAFT → POSTED → ALLOCATED/PARTIALLY_ALLOCATED
POSTED → REVERSED
```

Allocation tidak boleh melebihi saldo invoice. Reversal menjadi transaksi baru.

## Stock Opname

```text
DRAFT → COUNTING → SUBMITTED → APPROVED → POSTED
DRAFT/COUNTING/SUBMITTED → CANCELLED
```

`POSTED` membuat adjustment untuk selisih yang disetujui.

## Price List

```text
DRAFT → PENDING_APPROVAL → ACTIVE → EXPIRED
DRAFT/PENDING_APPROVAL → REJECTED
ACTIVE → SUPERSEDED
```

Harga invoice/PO disimpan sebagai snapshot.

## Audit rule

Tidak ada transisi mundur setelah POSTED. Koreksi memakai reversal, credit note, return, atau adjustment sesuai modul.
