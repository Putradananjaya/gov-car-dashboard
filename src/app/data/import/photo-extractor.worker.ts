/// <reference lib="webworker" />
import JSZip from 'jszip';
import { parseDrawingAnchors, parseDrawingRels } from './drawing-anchor-parser';

/**
 * Web Worker ekstraksi & kompresi foto kendaraan dari arsip zip `.xlsx`
 * (dokumen v2 bag. 4.4). Berjalan di luar thread utama karena berkas asli
 * bisa memuat puluhan MB foto tertanam.
 */

const MAX_WIDTH = 1280;
const TARGET_BYTES = 200 * 1024;

export interface ExtractRequest {
  type: 'extract';
  buffer: ArrayBuffer;
}

export interface ExtractedPhoto {
  /** Baris OOXML 0-based (bukan nomor baris spreadsheet) — dipetakan ke NIBAR di thread utama. */
  row: number;
  blob: Blob;
}

export type WorkerResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'result'; photos: ExtractedPhoto[] }
  | { type: 'error'; message: string };

function guessMimeType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpeg') || lower.endsWith('.jpg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

async function compressToWebp(bytes: Uint8Array, mimeType: string): Promise<Blob> {
  // .slice() jamin ArrayBuffer konkret (bukan ArrayBufferLike/SharedArrayBuffer)
  // supaya cocok dengan tipe BlobPart yang diharapkan konstruktor Blob.
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const sourceBlob = new Blob([arrayBuffer], { type: mimeType });
  const bitmap = await createImageBitmap(sourceBlob);

  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context tidak tersedia.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let output = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  if (output.size > TARGET_BYTES) {
    output = await canvas.convertToBlob({ type: 'image/webp', quality: 0.6 });
  }
  return output;
}

addEventListener('message', async (event: MessageEvent<ExtractRequest>) => {
  if (event.data.type !== 'extract') return;

  try {
    const zip = await JSZip.loadAsync(event.data.buffer);

    const drawingFile = zip.file('xl/drawings/drawing1.xml');
    const relsFile = zip.file('xl/drawings/_rels/drawing1.xml.rels');

    if (!drawingFile || !relsFile) {
      // Berkas tidak memuat gambar tertanam (mis. fixture anonim) — bukan galat.
      const done: WorkerResponse = { type: 'result', photos: [] };
      postMessage(done);
      return;
    }

    const [drawingXml, relsXml] = await Promise.all([drawingFile.async('string'), relsFile.async('string')]);
    const anchors = parseDrawingAnchors(drawingXml);
    const rels = parseDrawingRels(relsXml);

    const total = anchors.length;
    const photos: ExtractedPhoto[] = [];
    let done = 0;

    for (const anchor of anchors) {
      const path = rels[anchor.rId];
      const zipEntry = path ? zip.file(`xl/${path}`) : null;

      if (zipEntry) {
        try {
          const bytes = await zipEntry.async('uint8array');
          const blob = await compressToWebp(bytes, guessMimeType(path));
          photos.push({ row: anchor.row, blob });
        } catch {
          // Lewati satu foto yang gagal diproses — jangan gagalkan semuanya.
        }
      }

      done++;
      const progress: WorkerResponse = { type: 'progress', done, total };
      postMessage(progress);
    }

    const result: WorkerResponse = { type: 'result', photos };
    postMessage(result);
  } catch (error) {
    const message: WorkerResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses foto dari berkas Excel.'
    };
    postMessage(message);
  }
});
