const encoder = new TextEncoder();
const decoder = new TextDecoder();

type ZipEntry = { name: string; bytes: Uint8Array; crc: number; offset: number };

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let k = 0; k < 8; k++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const write16 = (view: DataView, offset: number, value: number) => view.setUint16(offset, value, true);
const write32 = (view: DataView, offset: number, value: number) => view.setUint32(offset, value >>> 0, true);

const concatBytes = (parts: Uint8Array[]): Uint8Array => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};

const zipStore = (files: Array<{ name: string; content: string }>): Uint8Array => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const bytes = encoder.encode(file.content);
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
    write16(localView, 8, 0); write16(localView, 10, 0); write16(localView, 12, 0);
    write32(localView, 14, crc); write32(localView, 18, bytes.length); write32(localView, 22, bytes.length);
    write16(localView, 26, name.length); write16(localView, 28, 0); local.set(name, 30);
    localParts.push(local, bytes);
    entries.push({ name: file.name, bytes, crc, offset });
    offset += local.length + bytes.length;
  }

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const central = new Uint8Array(46 + name.length);
    const view = new DataView(central.buffer);
    write32(view, 0, 0x02014b50); write16(view, 4, 20); write16(view, 6, 20);
    write16(view, 8, 0x0800); write16(view, 10, 0); write16(view, 12, 0); write16(view, 14, 0);
    write32(view, 16, entry.crc); write32(view, 20, entry.bytes.length); write32(view, 24, entry.bytes.length);
    write16(view, 28, name.length); write16(view, 30, 0); write16(view, 32, 0);
    write16(view, 34, 0); write16(view, 36, 0); write32(view, 38, 0); write32(view, 42, entry.offset);
    central.set(name, 46); centralParts.push(central);
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50); write16(endView, 4, 0); write16(endView, 6, 0);
  write16(endView, 8, entries.length); write16(endView, 10, entries.length);
  write32(endView, 12, centralDirectory.length); write32(endView, 16, offset); write16(endView, 20, 0);
  return concatBytes([...localParts, centralDirectory, end]);
};

const xmlEscape = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const columnName = (index: number): string => {
  let number = index + 1;
  let name = '';
  while (number > 0) { const remainder = (number - 1) % 26; name = String.fromCharCode(65 + remainder) + name; number = Math.floor((number - 1) / 26); }
  return name;
};

export const createXlsx = (sheetName: string, rows: unknown[][]): Uint8Array => {
  const safeSheetName = sheetName.replace(/[\\/*?:\x5B\x5D]/g, ' ').slice(0, 31) || 'Data';
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      if (value === null || value === undefined || value === '') return '';
      const ref = columnName(columnIndex) + (rowIndex + 1);
      return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(value) + '</t></is></c>';
    }).join('');
    return '<row r="' + (rowIndex + 1) + '">' + cells + '</row>';
  }).join('');
  const files = [
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xmlEscape(safeSheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + sheetRows + '</sheetData></worksheet>' },
  ];
  return zipStore(files);
};

export const saveXlsx = (filename: string, sheetName: string, rows: unknown[][]): void => {
  const bytes = createXlsx(sheetName, rows);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
};

const parseXml = (xml: string, partName: string): Document => {
  const documentXml = new DOMParser().parseFromString(xml, 'application/xml');
  if (documentXml.querySelector('parsererror')) throw new Error('Workbook XML is invalid: ' + partName);
  return documentXml;
};

const readZip = async (file: File): Promise<Map<string, Uint8Array>> => {
  if (file.size > 25 * 1024 * 1024) throw new Error('XLSX file exceeds the 25 MB limit.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOffset = -1;
  for (let i = Math.max(0, bytes.length - 65557); i <= bytes.length - 22; i++) {
    if (view.getUint32(i, true) === 0x06054b50) endOffset = i;
  }
  if (endOffset < 0) throw new Error('Invalid XLSX: ZIP directory was not found.');
  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (entryCount > 200) throw new Error('XLSX contains too many archive entries.');
  const files = new Map<string, Uint8Array>();
  let cursor = directoryOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid XLSX ZIP directory.');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (name.startsWith('/') || name.split('/').includes('..')) throw new Error('Invalid XLSX archive path.');
    if (name.endsWith('/')) continue;
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > 60 * 1024 * 1024) throw new Error('XLSX expands beyond the 60 MB safety limit.');
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Invalid XLSX local file header.');
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > bytes.length) throw new Error('Invalid XLSX entry size.');
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let content: Uint8Array;
    if (method === 0) content = compressed;
    else if (method === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress XLSX files. Use CSV import instead.');
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      content = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('Unsupported XLSX compression method: ' + method);
    if (content.length !== uncompressedSize) throw new Error('Invalid XLSX uncompressed size.');
    files.set(name, content);
  }
  return files;
};

const resolvePart = (base: string, target: string): string => {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop(); else parts.push(part);
  }
  return parts.join('/');
};

const columnIndex = (reference: string): number => {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
};

export const parseXlsx = async (file: File): Promise<string[][]> => {
  const files = await readZip(file);
  const readText = (path: string): string => {
    const content = files.get(path);
    if (!content) throw new Error('XLSX is missing required part: ' + path);
    return decoder.decode(content);
  };
  const workbook = parseXml(readText('xl/workbook.xml'), 'xl/workbook.xml');
  const sheet = workbook.getElementsByTagName('sheet')[0];
  if (!sheet) throw new Error('XLSX workbook does not contain a worksheet.');
  const relationshipId = sheet.getAttribute('r:id');
  if (!relationshipId) throw new Error('XLSX worksheet relationship is missing.');
  const relationships = parseXml(readText('xl/_rels/workbook.xml.rels'), 'xl/_rels/workbook.xml.rels');
  const relation = Array.from(relationships.getElementsByTagName('Relationship')).find(item => item.getAttribute('Id') === relationshipId);
  const target = relation?.getAttribute('Target');
  if (!target) throw new Error('XLSX worksheet relationship target is invalid.');
  const sheetPath = resolvePart('xl/workbook.xml', target);
  const worksheet = parseXml(readText(sheetPath), sheetPath);
  const sharedStrings = files.has('xl/sharedStrings.xml')
    ? Array.from(parseXml(readText('xl/sharedStrings.xml'), 'xl/sharedStrings.xml').getElementsByTagName('si')).map(item =>
      Array.from(item.getElementsByTagName('t')).map(textNode => textNode.textContent ?? '').join(''))
    : [];
  const rows: string[][] = [];
  const sheetData = worksheet.getElementsByTagName('sheetData')[0];
  if (!sheetData) throw new Error('XLSX worksheet does not contain sheet data.');
  for (const rowNode of Array.from(sheetData.getElementsByTagName('row'))) {
    const cells: string[] = [];
    for (const cell of Array.from(rowNode.children).filter(item => item.localName === 'c')) {
      const index = columnIndex(cell.getAttribute('r') ?? '');
      if (index < 0 || index > 500) continue;
      const type = cell.getAttribute('t');
      let value = '';
      if (type === 'inlineStr') value = Array.from(cell.getElementsByTagName('t')).map(node => node.textContent ?? '').join('');
      else {
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        if (type === 's') value = sharedStrings[Number(raw)] ?? '';
        else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
        else value = raw;
      }
      cells[index] = value;
    }
    rows.push(cells.map(value => value ?? ''));
  }
  return rows.filter(row => row.some(value => value.trim() !== ''));
};
