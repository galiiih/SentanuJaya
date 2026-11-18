# Nanu AI — Integrasi 9Router dan Ollama Local

## Tujuan
Panduan konektivitas Nanu AI pada Sentanu Jaya ERP ke layanan model pada PC Windows di LAN. Terpisah dari pekerjaan Nanu Knowledge Base & ERP Documentation Center.

## Arsitektur yang tercatat
| Komponen | Host | Endpoint |
|---|---|---|
| ERP Laravel | Ubuntu 192.168.0.181 | Nanu AI service |
| 9Router Combo | Windows 192.168.0.51 | http://192.168.0.51:20128/v1 |
| Ollama | Windows 192.168.0.51 | http://192.168.0.51:11434 |

TCP 20128 dan 11434 dapat dijangkau dari Ubuntu pada snapshot audit. Ollama /api/tags pernah menghasilkan HTTP 200. Request tanpa Authorization ke 9Router /v1/models menghasilkan HTTP 401. Request itu tidak memakai API key tersimpan, sehingga 401 bukan bukti key server salah/hilang.

## Variabel environment
Pada shared environment Ubuntu, keberadaan variabel berikut pernah diperiksa tanpa mencetak nilainya dan semuanya dilaporkan SET:
- PUFFY_AI_PROVIDER
- PUFFY_OLLAMA_URL
- PUFFY_OLLAMA_MODEL
- PUFFY_OPENAI_BASE_URL
- PUFFY_OPENAI_API_KEY
- PUFFY_OPENAI_MODEL
- PUFFY_AI_TIMEOUT

API key sudah tersimpan di Ubuntu menurut konfirmasi operator. Jangan meminta operator memasukkan ulang key hanya berdasarkan request tanpa Authorization.

## Contoh .env.example
Placeholder berikut bukan nilai produksi dan tidak boleh dipakai tanpa mengganti model/key sesuai setup:
```dotenv
PUFFY_AI_PROVIDER=openai
PUFFY_OPENAI_BASE_URL=http://192.168.0.51:20128/v1
PUFFY_OPENAI_API_KEY=replace-with-your-own-key
PUFFY_OPENAI_MODEL=replace-with-model-id
PUFFY_OLLAMA_URL=http://192.168.0.51:11434
PUFFY_OLLAMA_MODEL=replace-with-local-model
PUFFY_AI_TIMEOUT=120
```

Provider/model contoh tidak menyatakan pilihan runtime produksi. Cocokkan dengan config Laravel dan model pada PC Windows.

## Alur konseptual
1. User mengirim prompt dari UI Nanu.
2. Laravel memproses melalui AI service (source server yang pernah diperiksa menyebut class PuffyAiService).
3. Service memilih provider berdasarkan konfigurasi.
4. Jalur 9Router memakai base URL OpenAI-compatible dan API key; header dan model harus diverifikasi dari source aktif.
5. Jalur Ollama mengakses endpoint Ollama LAN.
6. Response dikembalikan ke UI.

Kedua endpoint dapat dijangkau tidak otomatis berarti automatic fallback sudah dibuat. Retry/fallback/timeout perlu dibuktikan dari implementasi service.

## Prasyarat Windows
- PC menyala dan tersambung LAN; gunakan DHCP reservation atau IP stabil.
- 9Router aktif pada TCP 20128; Ollama aktif pada TCP 11434.
- Model sudah tersedia di host Windows.
- Windows Firewall membatasi akses dari host/subnet Ubuntu yang diperlukan.
- Pastikan service bind pada interface LAN; bind localhost saja tidak cukup.
- Jangan expose port AI ke internet.

## Prasyarat Ubuntu/Laravel
- TCP ke kedua endpoint berhasil.
- Shared .env berisi variabel yang diperlukan dan permission terbatas.
- config/services.php memetakan env ke Laravel config.
- AI service membaca config dan mengirim autentikasi sesuai gateway.
- Jika config cache dipakai, runtime harus membaca konfigurasi terbaru setelah perubahan yang sah. Jangan clear cache/restart PHP-FPM tanpa sebab terverifikasi.

## Verifikasi aman
Cek TCP:
```bash
nc -vz 192.168.0.51 20128
nc -vz 192.168.0.51 11434
```
Cek Ollama tanpa secret:
```bash
curl -fsS http://192.168.0.51:11434/api/tags
```
Cek keberadaan env tanpa menampilkan nilainya:
```bash
APP=/home/galih/apps/sentanu-jaya/current/backend
ENV_FILE=/home/galih/apps/sentanu-jaya/shared/.env
for key in PUFFY_AI_PROVIDER PUFFY_OLLAMA_URL PUFFY_OLLAMA_MODEL PUFFY_OPENAI_BASE_URL PUFFY_OPENAI_API_KEY PUFFY_OPENAI_MODEL PUFFY_AI_TIMEOUT; do
  if sudo grep -qE "^${key}=.+" "$ENV_FILE"; then printf '%s=SET\n' "$key"; else printf '%s=UNSET\n' "$key"; fi
done
```

Autentikasi 9Router harus diuji menggunakan key tersimpan tanpa menampilkan key/header di terminal, shell history, screenshot, atau log. Hindari curl -v. Pengujian harus hanya melaporkan status HTTP.

## Perbedaan repo vs runtime yang perlu diselaraskan
Source server sebelumnya menunjukkan PuffyAiService membaca config('services.puffy.openai_api_key'). Namun backend/config/services.php pada branch main yang diperiksa belum memuat blok puffy. Karena itu, konfigurasi produksi dan konfigurasi yang terversion-control belum terbukti sinkron. Jangan menganggap file di GitHub sama dengan release produksi sebelum dibandingkan. Ini perlu ditangani pada patch kode terpisah setelah source aktif dan perilaku autentikasi diperiksa.

## Troubleshooting
| Gejala | Pemeriksaan |
|---|---|
| TCP 20128 gagal | 9Router, bind interface, Windows Firewall, jaringan |
| HTTP 401 | Pastikan Authorization benar-benar dikirim dengan key tersimpan; jangan bocorkan key |
| HTTP 404/model not found | Base path /v1 dan model ID |
| Timeout | PC sleep, Wi-Fi, firewall, cold start, timeout |
| Ollama 200 tetapi Nanu gagal | Laravel config, payload, model, response parsing |
| Env SET tetapi runtime tidak berubah | Config cache atau release aktif berbeda |

## Status verifikasi
| Item | Status |
|---|---|
| Windows AI PC 192.168.0.51 | Tercatat |
| TCP 20128 dan 11434 dari Ubuntu | Terverifikasi pada snapshot |
| Ollama /api/tags HTTP 200 | Terverifikasi pada snapshot |
| 9Router tanpa Authorization HTTP 401 | Terverifikasi; bukan uji API key |
| Variabel AI shared .env | Semua dilaporkan SET |
| API key tersimpan di Ubuntu | Dikonfirmasi operator; nilai tidak dicatat |
| Laravel mengirim Bearer key runtime | Menunggu pemeriksaan source aktif |
| Config cache sesuai shared .env | Belum diverifikasi |
| Automatic fallback 9Router ↔ Ollama | Belum diverifikasi |
| Nanu end-to-end produksi | Belum dinyatakan terverifikasi |

## Keamanan
Jangan commit .env, key, token, dump, log berisi prompt/data customer. Batasi port AI ke LAN/VPN yang diperlukan. Rotasi key hanya jika ada indikasi kompromi, bukan sebagai langkah troubleshooting default.
