import type { StreamEvent } from "./types";

/** Membaca respons text/event-stream dari fetch() dan menghasilkan event bertipe. */
export async function* readSSE(res: Response): AsyncGenerator<StreamEvent> {
  if (!res.body) throw new Error("Respons server tidak berisi stream.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf = (buf + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n");
      let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const ev = parseBlock(buf.slice(0, i));
        buf = buf.slice(i + 2);
        if (ev) yield ev;
      }
    }
    const tail = parseBlock(buf.trim());
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block: string): StreamEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue; // komentar / heartbeat
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  if (!data.length) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) } as unknown as StreamEvent;
  } catch {
    return null;
  }
}
