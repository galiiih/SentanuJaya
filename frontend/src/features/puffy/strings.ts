import { permissions, type Permission } from "../../auth";
import type { Language } from "../../i18n";

export interface PuffyStrings {
  title: string;
  page: string;
  shortcutHint: string;
  welcome: (name: string) => string;
  greet: string;
  placeholder: string;
  send: string;
  stop: string;
  minimize: string;
  openChat: string;
  askMe: string;
  noData: string;
  retry: string;
  copy: string;
  copied: string;
  copyFailed: string;
  mic: string;
  helpful: string;
  notHelpful: string;
  willDo: string;
  confirmQ: string;
  cancel: string;
  proceed: string;
  processing: string;
  done: string;
  cancelled: string;
  failed: string;
  mockBadge: string;
  noAccess: string;
  micDenied: string;
  micNoSpeech: string;
  asOf: string;
  quips: string[];
  suggestions: { text: string; permission: Permission }[];
}

const id: PuffyStrings = {
  title: "Puffy · asisten admin",
  page: "Halaman",
  shortcutHint: "Ctrl+K untuk bertanya",
  welcome: (name) => `Halo ${name}! Aku Puffy. Tanya soal pengiriman, barang masuk, stok material, produksi, atau piutang.`,
  greet: "Hai! Aku Puffy 💗 Tanya aku soal data Sentanu Jaya.",
  placeholder: "Tanya Puffy…",
  send: "Kirim",
  stop: "Hentikan",
  minimize: "Kecilkan (Esc)",
  openChat: "Buka chat Puffy",
  askMe: "Ask me 💬",
  noData: "Belum ada data untuk ditampilkan.",
  retry: "Coba lagi",
  copy: "Salin",
  copied: "Tersalin",
  copyFailed: "Gagal menyalin",
  mic: "Bicara dengan Puffy",
  helpful: "Jawaban membantu",
  notHelpful: "Jawaban kurang tepat",
  willDo: "Puffy akan:",
  confirmQ: "Lanjutkan?",
  cancel: "Batal",
  proceed: "Lanjutkan",
  processing: "Memproses…",
  done: "tercatat di audit log.",
  cancelled: "Dibatalkan.",
  failed: "Gagal diproses. Coba lagi.",
  mockBadge: "Data contoh",
  noAccess: "Kamu belum punya akses ke halaman itu.",
  micDenied: "Izin mikrofon ditolak atau diblokir.",
  micNoSpeech: "Aku tidak mendengar suara. Coba lagi ya.",
  asOf: "per",
  quips: ["Hehe, geli!", "Mau lihat data apa hari ini?", "Aku lagi jaga angka-angkamu 💗", "Coba tanya: stok material menipis?"],
  suggestions: [
    { text: "Hari ini kirim berapa?", permission: permissions.deliveryView },
    { text: "Barang masuk hari ini", permission: permissions.custodyView },
    { text: "Stok material menipis", permission: permissions.materialView },
    { text: "Progres produksi", permission: permissions.dashboardView },
    { text: "Piutang dan pembayaran", permission: permissions.paymentView },
  ],
};

const en: PuffyStrings = {
  title: "Puffy · admin assistant",
  page: "Page",
  shortcutHint: "Ctrl+K to ask",
  welcome: (name) => `Hi ${name}! I am Puffy. Ask about deliveries, incoming goods, material stock, production, or receivables.`,
  greet: "Hi! I am Puffy 💗 Ask me about Sentanu Jaya data.",
  placeholder: "Ask Puffy…",
  send: "Send",
  stop: "Stop",
  minimize: "Minimize (Esc)",
  openChat: "Open Puffy chat",
  askMe: "Ask me 💬",
  noData: "No data to show yet.",
  retry: "Try again",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  mic: "Talk to Puffy",
  helpful: "Helpful answer",
  notHelpful: "Not accurate",
  willDo: "Puffy will:",
  confirmQ: "Proceed?",
  cancel: "Cancel",
  proceed: "Proceed",
  processing: "Processing…",
  done: "recorded in the audit log.",
  cancelled: "Cancelled.",
  failed: "Could not be processed. Try again.",
  mockBadge: "Sample data",
  noAccess: "You do not have access to that page yet.",
  micDenied: "Microphone permission was denied or blocked.",
  micNoSpeech: "I could not hear anything. Please try again.",
  asOf: "as of",
  quips: ["Hehe, that tickles!", "What data shall we look at today?", "I am keeping your numbers safe 💗", "Try asking: low material stock?"],
  suggestions: [
    { text: "How many deliveries today?", permission: permissions.deliveryView },
    { text: "Goods received today", permission: permissions.custodyView },
    { text: "Low material stock", permission: permissions.materialView },
    { text: "Production progress", permission: permissions.dashboardView },
    { text: "Receivables and payments", permission: permissions.paymentView },
  ],
};

export const getStrings = (language: Language): PuffyStrings => (language === "en" ? en : id);
