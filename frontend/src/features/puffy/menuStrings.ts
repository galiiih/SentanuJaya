import type { Language } from "../../i18n";
import type { ImageErrorCode } from "./imageUtils";

export interface MenuStrings {
  settings: string;
  back: string;
  mascot: string;
  mascotHint: string;
  mascotChanged: (name: string) => string;
  customMascot: string;
  uploadImage: string;
  changeImage: string;
  removeImage: string;
  imageHint: string;
  imageError: Record<ImageErrorCode, string>;
  palette: string;
  behavior: string;
  autoSpeak: string;
  autoSpeakHint: string;
  idleLabel: string;
  idleOption: (seconds: number) => string;
  startOpen: string;
  startOpenHint: string;
  reset: string;
}

const id: MenuStrings = {
  settings: "Pengaturan Puffy",
  back: "Kembali ke chat",
  mascot: "Maskot",
  mascotHint: "Pilih tampilan Puffy. Pilihanmu tersimpan di browser ini.",
  mascotChanged: (name) => `Sekarang aku tampil sebagai ${name}!`,
  customMascot: "Gambar saya",
  uploadImage: "Unggah gambar",
  changeImage: "Ganti gambar",
  removeImage: "Hapus gambar",
  imageHint: "PNG, JPG, WebP, atau SVG, maks. 3 MB. Gambar diperkecil dan hanya disimpan di browser ini.",
  imageError: { type: "File harus berupa gambar.", size: "Gambar terlalu besar (maks. 3 MB).", load: "Gambar tidak dapat dibaca." },
  palette: "Warna",
  behavior: "Perilaku",
  autoSpeak: "Bacakan jawaban otomatis",
  autoSpeakHint: "Puffy membacakan setiap jawaban, bukan hanya saat kamu bertanya lewat suara.",
  idleLabel: "Mengecil otomatis setelah",
  idleOption: (s) => (s === 0 ? "Tidak pernah" : `${s} detik`),
  startOpen: "Mulai dalam keadaan terbuka",
  startOpenHint: "Panel chat langsung terbuka saat halaman dimuat.",
  reset: "Kembalikan ke bawaan",
};

const en: MenuStrings = {
  settings: "Puffy settings",
  back: "Back to chat",
  mascot: "Mascot",
  mascotHint: "Choose how Puffy looks. Your choice is saved in this browser.",
  mascotChanged: (name) => `Now I look like ${name}!`,
  customMascot: "My image",
  uploadImage: "Upload image",
  changeImage: "Change image",
  removeImage: "Remove image",
  imageHint: "PNG, JPG, WebP, or SVG, max 3 MB. The image is downsized and stored only in this browser.",
  imageError: { type: "The file must be an image.", size: "The image is too large (max 3 MB).", load: "The image could not be read." },
  palette: "Color",
  behavior: "Behavior",
  autoSpeak: "Read answers aloud",
  autoSpeakHint: "Puffy reads every answer aloud, not only when you ask by voice.",
  idleLabel: "Minimize automatically after",
  idleOption: (s) => (s === 0 ? "Never" : `${s} seconds`),
  startOpen: "Start expanded",
  startOpenHint: "The chat panel is open as soon as the page loads.",
  reset: "Reset to defaults",
};

export const getMenuStrings = (language: Language): MenuStrings => (language === "en" ? en : id);
