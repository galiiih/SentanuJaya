# Dokumentasi Server Ubuntu — Sentanu Jaya ERP

Snapshot inventaris terakhir yang tersedia: 17–18 November 2026. Dokumen ini bukan live monitoring.

## Dokumen
- [Inventaris dan arsitektur](./inventory-and-architecture.md)
- [Deployment](./deployment.md)
- [Backup dan pemulihan](./backup-and-recovery.md)
- [Keamanan dan jaringan](./security-and-network.md)
- [Runbook operasional](./operations-runbook.md)
- [Integrasi Nanu, 9Router, dan Ollama](../nanu-ai/9router-ollama-integration.md)

## Prinsip
1. Jaga ERP produksi tetap tersedia; hindari restart/reboot tanpa alasan.
2. Diagnosis read-only dahulu, perubahan setelah penyebab diketahui.
3. Jangan commit .env, API key, password, token, private key, dump database, atau data customer.
4. Backup pada disk yang sama bukan backup off-host.
5. Bedakan status terverifikasi, indikasi, dan belum diverifikasi.
6. Dokumen ini melengkapi dokumentasi ERP dan Knowledge Base; fokusnya infrastruktur dan operasi server.
