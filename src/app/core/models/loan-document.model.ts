export type JenisDokumenPeminjaman = 'utama' | 'lain';

/** Berkas pendukung (surat tugas/undangan, lampiran lain) satu permohonan peminjaman. */
export interface LoanDocument {
  id: string;
  loanId: string;
  kind: JenisDokumenPeminjaman;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
}
