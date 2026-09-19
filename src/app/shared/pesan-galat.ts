import { HttpErrorResponse } from '@angular/common/http';

/**
 * Ubah galat HTTP menjadi kalimat yang bisa dibaca pengguna.
 *
 * NestJS mengirim detail validasi sebagai array di `error.message`
 * (mis. ["peran must be one of the following values: ..."]) dan pesan tunggal
 * untuk galat seperti Conflict ("NIP ... sudah terdaftar."). Tanpa penerjemah
 * ini, kegagalan hanya jatuh ke konsol browser dan pengguna cuma melihat
 * formulir yang diam — mengira simpanannya berhasil.
 */
export function pesanGalat(error: unknown, bawaan = 'Terjadi kesalahan. Coba lagi.'): string {
  if (!(error instanceof HttpErrorResponse)) return bawaan;

  // status 0 = permintaan tidak pernah sampai (jaringan mati, server tidak
  // menjawab, CORS ditolak) — badan responsnya kosong, jadi perlu pesan sendiri.
  if (error.status === 0) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';
  }

  const isi = error.error as { message?: string | string[] } | string | null;
  if (typeof isi === 'string' && isi.trim()) return isi;

  const pesan = typeof isi === 'object' && isi !== null ? isi.message : undefined;
  if (Array.isArray(pesan) && pesan.length > 0) return pesan.join('. ');
  if (typeof pesan === 'string' && pesan.trim()) return pesan;

  return bawaan;
}
