/**
 * Fungsi normalisasi murni untuk pipeline impor e-BMD (dokumen v2 bag. 4.2).
 * Tidak ada state, tidak ada I/O — supaya mudah diuji dan dipakai ulang
 * ketika format OPD lain sedikit berbeda.
 */

const BULAN_INDONESIA: Record<string, number> = {
  januari: 1,
  februari: 2,
  pebruari: 2, // ejaan lama
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  nopember: 11, // ejaan lama
  november: 11,
  desember: 12
};

/** Rapikan spasi: buang spasi di awal/akhir, kolapskan spasi ganda ke satu; sel isi spasi saja jadi string kosong. */
export function collapseSpaces(raw: unknown): string {
  const text = String(raw ?? '');
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parser tanggal berformat teks Indonesia, mis. "12 Nopember 2026",
 * "14 nopember 2026", "09 Agustus 2026". Menerima ejaan lama, huruf
 * besar/kecil bebas, dan 1-2 digit hari. Mengembalikan null bila tak terbaca.
 */
export function parseIndonesianDate(raw: unknown): string | null {
  const text = collapseSpaces(raw);
  if (!text) return null;

  const match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const monthName = match[2].toLowerCase();
  const year = Number(match[3]);
  const month = BULAN_INDONESIA[monthName];

  if (!month || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== day) return null;

  return iso;
}

/** Konversi serial tanggal numerik Excel (sistem 1900) ke ISO "YYYY-MM-DD". */
export function excelSerialToIso(serial: unknown): string | null {
  const value = typeof serial === 'number' ? serial : Number(serial);
  if (!Number.isFinite(value) || value <= 0) return null;

  const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
  const ms = EXCEL_EPOCH_UTC_MS + Math.round(value) * 86400000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

/** Kolom O berisi "Merk: Toyota New Rush 1.5 S M/T TRD" — buang prefiks, pisah merek/tipe. */
export function parseMerekTipe(raw: unknown): { merek: string; tipe: string } {
  const text = collapseSpaces(raw).replace(/^merk\s*:\s*/i, '');
  if (!text) return { merek: '', tipe: '' };

  const spaceIndex = text.indexOf(' ');
  if (spaceIndex === -1) return { merek: text, tipe: '' };

  return { merek: text.slice(0, spaceIndex), tipe: text.slice(spaceIndex + 1).trim() };
}

/** Kolom AC — "Kendaraan Operasional" berarti tidak dipegang perorangan. */
export function parsePemegang(raw: unknown): { pemegang: string | null; isOperasionalBersama: boolean } {
  const text = collapseSpaces(raw);
  if (!text) return { pemegang: null, isOperasionalBersama: false };
  if (text === 'Kendaraan Operasional') return { pemegang: null, isOperasionalBersama: true };
  return { pemegang: text, isOperasionalBersama: false };
}

/** Kolom Q kadang berisi dua pelat dalam satu sel, mis. "DK 18 P/1570 P". */
export function parseNomorPolisi(raw: unknown): { nomorPolisi: string; catatan: string | null } {
  const text = collapseSpaces(raw);
  const slashIndex = text.indexOf('/');
  if (slashIndex === -1) return { nomorPolisi: text, catatan: null };

  const first = text.slice(0, slashIndex).trim();
  const rest = text.slice(slashIndex + 1).trim();
  return {
    nomorPolisi: first,
    catatan: `Sel sumber memuat lebih dari satu nomor polisi ("${text}") — perlu verifikasi manual.`
  };
}
