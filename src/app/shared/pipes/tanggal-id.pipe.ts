import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/**
 * Format tanggal baku aplikasi: "19 September 2026".
 * Dipakai untuk nilai yang memang tidak menyimpan jam (rencana pinjam,
 * masa berlaku pajak/STNK, tanggal perolehan, jadwal servis).
 */
export const FORMAT_TANGGAL = 'd MMMM y';

/** Format lengkap baku aplikasi: "19 September 2026 - 14:30". */
export const FORMAT_TANGGAL_JAM = 'd MMMM y - HH:mm';

/** Nilai ISO tanpa komponen waktu, mis. "2026-09-19". */
const POLA_TANGGAL_SAJA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 'auto'    — pakai jam hanya bila nilainya memang punya komponen waktu.
 * 'tanggal' — paksa tanpa jam.
 * 'lengkap' — paksa dengan jam.
 */
export type ModeTanggal = 'auto' | 'tanggal' | 'lengkap';

export function formatTanggalId(
  nilai: Date | string | number | null | undefined,
  locale: string,
  mode: ModeTanggal = 'auto',
  kosong = '—'
): string {
  if (nilai === null || nilai === undefined || nilai === '') return kosong;

  const teks = typeof nilai === 'string' ? nilai.trim() : nilai;
  if (teks === '') return kosong;

  const tanpaJam =
    mode === 'tanggal' ||
    (mode === 'auto' && typeof teks === 'string' && POLA_TANGGAL_SAJA.test(teks));

  try {
    return formatDate(teks, tanpaJam ? FORMAT_TANGGAL : FORMAT_TANGGAL_JAM, locale);
  } catch {
    // Data lama/impor bisa saja tidak terbaca sebagai tanggal — tampilkan apa
    // adanya daripada menyembunyikan isinya dari pengguna.
    return typeof teks === 'string' ? teks : kosong;
  }
}

/**
 * Satu-satunya sumber format tanggal di seluruh tampilan aplikasi.
 * Pakai `{{ nilai | tanggalId }}`; argumen kedua memaksa mode, argumen
 * ketiga mengganti teks saat nilainya kosong (default "—").
 */
@Pipe({ name: 'tanggalId', standalone: true })
export class TanggalIdPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    nilai: Date | string | number | null | undefined,
    mode: ModeTanggal = 'auto',
    kosong = '—'
  ): string {
    return formatTanggalId(nilai, this.locale, mode, kosong);
  }
}
