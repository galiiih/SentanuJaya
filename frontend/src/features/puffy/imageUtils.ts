const MAX_SIZE = 256;
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

export type ImageErrorCode = 'type' | 'size' | 'load';

type ImageResult = { ok: true; dataUrl: string } | { ok: false; error: ImageErrorCode };

/** Validate + resize image file → data URL PNG (max 256px). */
export async function imageFileToDataUrl(file: File): Promise<ImageResult> {
  if (!file.type.startsWith('image/')) return { ok: false, error: 'type' };
  if (file.size > MAX_BYTES) return { ok: false, error: 'size' };
  try {
    const dataUrl = await resizeImage(file);
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: 'load' };
  }
}

/**
 * Resize gambar ke max 256px (sisi terpanjang), output data-URL PNG.
 */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BYTES) return reject(new Error('File terlalu besar (maks 3 MB)'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bukan gambar yang valid'));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('Canvas tidak didukung'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
