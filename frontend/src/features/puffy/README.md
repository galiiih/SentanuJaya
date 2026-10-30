# Puffy — asisten admin Sentanu Jaya

Asisten chat yang bertengger di pojok kanan bawah layout terautentikasi. Ia menjawab lewat **SSE**,
menampilkan hasil tool sebagai kartu (angka dan tabel dari backend, bukan dari teks model),
lalu memindahkan halaman dan menunjuk tabel atau grafik yang relevan.

## Titik sentuh ke kode yang sudah ada

Hanya dua baris di `src/App.tsx`:

```tsx
import { PuffyAssistant } from './features/puffy';   // di blok import
...
<PuffyAssistant />                                   // di dalam <div className="app-shell">, setelah .app-shell__main
```

Tidak ada file lain yang diubah. Gaya memakai token di `App.css` (`--color-*`, `--radius-*`, `[data-theme="dark"]`),
komponen `.button`, `.input`, `.icon-button`, dan `.alert` yang sudah ada. Auth, izin, bahasa (ID/EN), dan router
diambil dari `useAuth`, `useLanguage`, dan `react-router-dom`.

Untuk menghapus: hapus folder ini dan dua baris di atas. Sisanya tidak berubah.

## Perilaku

- Mulai sebagai balon **"Ask me 💬"**. Klik balon atau tekan `Ctrl+K` untuk membuka (`defaultOpen` untuk mulai terbuka).
- Saat terbuka, `.app-content` diberi `padding-right` (hanya di layar > 820 px) lalu melebar lagi saat Puffy mengecil. Efeknya murni CSS di `puffy.css`.
- Mengecil sendiri setelah 9 detik tanpa aktivitas, **kecuali** kursor ada di atas panel, ada draf di kolom ketik, Puffy sedang menjawab, atau mikrofon aktif.
- Pindah menu saat Puffy mengecil tidak membukanya lagi. `Esc` hanya berlaku bila fokus ada di dalam panel, jadi tidak bentrok dengan modal.
- Panel memakai `role="region"` (bukan `dialog`) agar tidak bentrok dengan `getByRole('dialog')` di `e2e/functional.spec.ts`.
- Selama Puffy tertutup (bawaan), tidak ada pencarian di `e2e/*.spec.ts` yang mengenai elemen Puffy (210 pencarian diperiksa dengan mesin locator Playwright). Bila Puffy dibuka saat tes berjalan (mis. `defaultOpen`), `page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last()` bisa mengenai chip "Piutang dan pembayaran".
- Chip saran disaring menurut izin pengguna. Rute di luar `ROUTES` (`config.ts`) atau tanpa izin diabaikan.

## Mencoba tanpa backend

```bash
VITE_PUFFY_MOCK=true npm run dev
```

Memakai respons SSE palsu (`mock.ts`) dengan **data contoh** yang melewati parser yang sama dengan backend asli.
Tanpa variabel itu dan tanpa endpoint di server, Puffy menampilkan pesan error dengan tombol "Coba lagi".

## Kontrak backend (belum ada di repo ini)

Autentikasi memakai cookie sesi yang sama dengan Axios (`credentials: "include"`), jadi rute Puffy cukup berada di
grup `Route::middleware([StartSession::class, 'auth'])` yang sudah ada.

| Method dan path | Fungsi |
|---|---|
| `POST /api/v1/puffy/chat` | Streaming SSE. Body: `{message, conversation_id, page_context}` |
| `POST /api/v1/puffy/feedback` | `{message_id, value: "up" \| "down"}` |
| `POST /api/v1/puffy/actions/{id}/confirm` · `/cancel` | Eksekusi aksi tulis setelah admin menekan tombol |

`page_context` = `{route, title, language, role, entity?}`.

Event dari `/chat` (tipe lengkap ada di `types.ts`):

```
event: status       data: {"label":"Memeriksa Surat Jalan…","ui":{"route":"/delivery","target":"table"}}
event: tool_result  data: {tool,title,summary,hasData,metrics?,table?,chart?,source,asOf,ui?,action?}
event: token        data: {"text":"…"}
event: done         data: {"message_id":"…","conversation_id":"…"}
event: error        data: {"message":"…"}
```

- `ui.route` harus salah satu rute di `ROUTES`. `ui.target` adalah `kpi`, `table`, `chart`, `summary`, `header`, `card`
  (opsional `table:1` untuk elemen kedua) atau nilai atribut `data-puffy` bila halaman perlu target khusus.
- `status.ui` membuat Puffy pindah halaman selagi data masih diambil.
- `action` hanyalah **proposal**. Data baru berubah saat backend menerima `/confirm`, dan backend wajib memeriksa
  izin dan Segregation of Duties seperti endpoint biasa.
- Kirim komentar `: ping` tiap sekitar 15 detik dan nonaktifkan buffering proxy (`X-Accel-Buffering: no`).

## Catatan

- Mikrofon memakai Web Speech API bawaan browser. Di Chrome audio diproses server browser, jadi **tidak lokal**.
- Ollama jangan diakses dari browser. Hanya Laravel yang boleh memanggilnya.
