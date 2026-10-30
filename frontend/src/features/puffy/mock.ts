import type { ToolResult, UiHint } from "./types";

/**
 * MODE CONTOH (opsional). Aktif hanya bila VITE_PUFFY_MOCK=true.
 * Menghasilkan Response text/event-stream palsu yang melewati jalur parser SSE yang sama
 * dengan backend asli, sehingga UI Puffy bisa ditinjau sebelum endpoint Laravel tersedia.
 * Semua angka di bawah adalah DATA CONTOH, bukan data Sentanu Jaya.
 */

interface Scenario {
  match: RegExp;
  status: string;
  ui?: UiHint;
  result: Omit<ToolResult, "asOf" | "tool">;
  reply: string;
}

const SCENARIOS: Scenario[] = [
  {
    match: /piutang|invoice|tagihan|bayar|payment|receivable/i,
    status: "Memeriksa invoice dan pembayaran…",
    ui: { route: "/payments", target: "table" },
    result: {
      title: "Piutang pelanggan",
      summary: "Piutang belum dibayar Rp 486 jt, 4 invoice jatuh tempo.",
      hasData: true,
      metrics: [{ label: "Belum dibayar", value: "Rp 486 jt" }, { label: "Jatuh tempo", value: "4 invoice" }, { label: "Masuk hari ini", value: "Rp 38 jt" }],
      table: { columns: ["Pelanggan", "Piutang", "Jatuh tempo"], rows: [["PT Karya Prima", "Rp 172 jt", "2 invoice"], ["PT Maju Jaya", "Rp 140 jt", "1 invoice"], ["CV Mitra Furnitur", "Rp 96 jt", "1 invoice"]] },
      source: "Invoice & Pembayaran · data contoh",
    },
    reply: "Piutang belum dibayar Rp 486 jt dan 4 invoice sudah jatuh tempo. Pembayaran masuk hari ini Rp 38 jt.",
  },
  {
    match: /produksi|proses|work ?order|production|polish|cat\b/i,
    status: "Memeriksa progres produksi…",
    result: {
      title: "Progres produksi",
      summary: "412 item di lini produksi, 2 pesanan terlambat.",
      hasData: true,
      metrics: [{ label: "Dalam proses", value: "412" }, { label: "Terlambat", value: "2 pesanan" }, { label: "Siap kirim", value: "96" }],
      table: { columns: ["Tahap", "Item"], rows: [["Pengecatan", "188"], ["Polishing", "74"], ["QC", "54"], ["Selesai", "96"]] },
      chart: { title: "Item per tahap", points: [{ label: "Cat", value: 188 }, { label: "Polish", value: 74 }, { label: "QC", value: 54 }, { label: "Selesai", value: 96 }] },
      source: "Work Order · data contoh",
    },
    reply: "Ada 412 item di lini produksi. 2 pesanan melewati jadwal dan 96 item sudah siap kirim.",
  },
  {
    match: /stok|material|habis|stock|bahan/i,
    status: "Memeriksa stok material…",
    ui: { route: "/materials", target: "table" },
    result: {
      title: "Stok material",
      summary: "2 material habis, 3 di bawah minimum.",
      hasData: true,
      metrics: [{ label: "Habis", value: "2" }, { label: "Di bawah min.", value: "3" }, { label: "Perlu dibeli", value: "5" }],
      table: { columns: ["SKU", "Material", "Stok", "Minimum"], rows: [["CT-HTM-01", "Cat hitam doff", "0 kg", "50 kg"], ["TH-001", "Thinner", "0 L", "30 L"], ["CT-PTH-02", "Cat putih gloss", "18 kg", "40 kg"], ["PW-ABU-01", "Powder abu metalik", "22 kg", "35 kg"]] },
      source: "Stok material · data contoh",
    },
    reply: "2 material stoknya nol dan 3 di bawah batas minimum. Paling mendesak dibeli: cat hitam doff dan thinner.",
  },
  {
    match: /masuk|diterima|terima|receiv|incoming|custody|stb/i,
    status: "Memeriksa penerimaan barang…",
    ui: { route: "/custody", target: "table" },
    result: {
      title: "Barang masuk hari ini",
      summary: "3 penerimaan, total 210 pcs.",
      hasData: true,
      metrics: [{ label: "Penerimaan", value: "3" }, { label: "Total qty", value: "210 pcs" }, { label: "Rusak", value: "1 item" }],
      table: { columns: ["No. STB", "Pelanggan", "Item · Warna", "Qty"], rows: [["STB-202610-0031", "PT Maju Jaya", "Rangka kursi · Hitam", "80"], ["STB-202610-0032", "CV Mitra Furnitur", "Meja besi · Putih", "70"], ["STB-202610-0033", "PT Karya Prima", "Rak display · Abu", "60"]] },
      source: "Penerimaan barang (STB) · data contoh",
    },
    reply: "Hari ini diterima 3 kiriman pelanggan dengan total 210 pcs. Satu item tercatat rusak saat diterima.",
  },
  {
    match: /kirim|surat jalan|deliver|terkirim|sj\b/i,
    status: "Memeriksa Surat Jalan…",
    ui: { route: "/delivery", target: "table" },
    result: {
      title: "Surat Jalan hari ini",
      summary: "6 Surat Jalan, 148 item.",
      hasData: true,
      metrics: [{ label: "Surat Jalan", value: "6" }, { label: "Item terkirim", value: "148" }, { label: "Menunggu", value: "2 SJ" }],
      table: { columns: ["No. SJ", "Pelanggan", "Item · Warna", "Qty"], rows: [["SJ-202610-0411", "PT Maju Jaya", "Rangka kursi · Hitam doff", "60"], ["SJ-202610-0412", "CV Mitra Furnitur", "Meja besi · Putih", "36"], ["SJ-202610-0413", "PT Karya Prima", "Rak display · Abu metalik", "52"]] },
      source: "Surat Jalan · data contoh",
      action: { id: "contoh-aksi-1", label: "Tandai SJ-202610-0412 terkirim", description: "menandai Surat Jalan SJ-202610-0412 sebagai DELIVERED" },
    },
    reply: "Hari ini terbit 6 Surat Jalan dengan 148 item terkirim. 2 Surat Jalan dari jadwal masih menunggu.",
  },
];

const FALLBACK = "Aku belum paham itu. Coba tanya soal pengiriman, barang masuk, stok material, produksi, atau piutang.";

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { window.clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });

export function mockPuffyResponse(path: string, body: unknown, signal?: AbortSignal): Response {
  if (path !== "/chat") return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });

  const message = String((body as { message?: string }).message ?? "");
  const scenario = SCENARIOS.find((s) => s.match.test(message));
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(ctl) {
      const send = (event: string, data: unknown) => ctl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        if (scenario) {
          send("status", { label: scenario.status, ui: scenario.ui });
          await wait(1100, signal);
          send("tool_result", { ...scenario.result, tool: "contoh", asOf: new Date().toISOString(), ui: scenario.ui });
          await wait(250, signal);
        } else {
          await wait(500, signal);
        }
        for (const word of (scenario?.reply ?? FALLBACK).split(/(?<= )/)) {
          send("token", { text: word });
          await wait(40, signal);
        }
        send("done", { message_id: `contoh-${Date.now()}`, conversation_id: "contoh" });
        ctl.close();
      } catch {
        ctl.error(new DOMException("Aborted", "AbortError"));
      }
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
