/**
 * Parser XML murni untuk anchor gambar OOXML (`xl/drawings/drawing1.xml`)
 * dan relasinya (`xl/drawings/_rels/drawing1.xml.rels`) — dokumen v2 bag.
 * 4.4. Dipisah dari `photo-extractor.worker.ts` supaya bisa diuji unit test
 * sungguhan (decode/resize gambar tidak bisa, ini bisa).
 *
 * Sengaja pakai regex, bukan DOMParser: DOMParser adalah API DOM/Window dan
 * tidak tersedia di scope Web Worker (jsdom menyediakannya di test sehingga
 * lolos unit test, tapi gagal runtime "DOMParser is not defined" di Worker
 * browser sungguhan). Struktur XML di sini cukup sempit & dapat diprediksi
 * untuk diparsing dengan aman lewat regex.
 */

export interface DrawingAnchor {
  /** Baris OOXML 0-based dari <xdr:from><xdr:row> — tambahkan 1 untuk nomor baris spreadsheet. */
  row: number;
  /** Relationship id dari <a:blip r:embed="..."> — dicocokkan lewat parseDrawingRels(). */
  rId: string;
}

export function parseDrawingAnchors(xml: string): DrawingAnchor[] {
  const anchorBlocks = xml.match(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g) ?? [];
  const anchors: DrawingAnchor[] = [];

  for (const block of anchorBlocks) {
    const fromBlock = block.match(/<xdr:from>[\s\S]*?<\/xdr:from>/)?.[0];
    const rowMatch = fromBlock?.match(/<xdr:row>(\d+)<\/xdr:row>/);
    const ridMatch = block.match(/<a:blip[^>]*\br:embed="([^"]+)"/);

    if (rowMatch && ridMatch) {
      anchors.push({ row: Number(rowMatch[1]), rId: ridMatch[1] });
    }
  }

  return anchors;
}

/** Peta rId -> path relatif dalam arsip zip (mis. "media/image1.jpeg"). */
export function parseDrawingRels(xml: string): Record<string, string> {
  const relationshipTags = xml.match(/<Relationship\b[^>]*\/?>/g) ?? [];
  const map: Record<string, string> = {};

  for (const tag of relationshipTags) {
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) {
      map[id] = target.replace(/^\.\.\//, '');
    }
  }

  return map;
}
