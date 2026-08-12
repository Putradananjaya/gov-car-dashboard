/**
 * Aturan validasi impor e-BMD (dokumen v2 bag. 4.3). Galat menolak baris
 * (tidak ikut masuk hasil impor); peringatan membiarkan baris masuk tapi
 * menandainya untuk verifikasi manual.
 */

export interface ValidationIssue {
  level: 'error' | 'warning';
  rowNumber: number;
  nibar: string;
  message: string;
}

export interface RowForRowValidation {
  rowNumber: number;
  nibar: string;
  nomorPolisi: string;
  nilaiPerolehan: number;
  tanggalPerolehanIso: string | null;
}

export function validateRow(row: RowForRowValidation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (message: string) => issues.push({ level: 'error', rowNumber: row.rowNumber, nibar: row.nibar, message });

  if (!row.nibar) {
    error('NIBAR kosong.');
  } else if (row.nibar.length !== 45) {
    error(`NIBAR harus 45 karakter, ditemukan ${row.nibar.length} karakter.`);
  }

  if (!row.nomorPolisi) {
    error('Nomor polisi kosong.');
  }

  if (!Number.isFinite(row.nilaiPerolehan)) {
    error('Nilai perolehan bukan angka.');
  }

  if (!row.tanggalPerolehanIso) {
    error('Tanggal perolehan tidak terbaca.');
  }

  return issues;
}

const DUA_PULUH_TAHUN_MS = 20 * 365.25 * 24 * 60 * 60 * 1000;

export interface RowForBatchValidation {
  rowNumber: number;
  nibar: string;
  nomorRangka: string;
  nomorBpkb: string | null;
  tanggalPerolehanIso: string | null;
  masaBerlakuPajakIso: string | null;
  masaBerlakuStnkIso: string | null;
}

export function validateBatch(rows: RowForBatchValidation[], now: Date = new Date()): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const warn = (row: RowForBatchValidation, message: string) =>
    issues.push({ level: 'warning', rowNumber: row.rowNumber, nibar: row.nibar, message });

  const rangkaGroups = new Map<string, RowForBatchValidation[]>();
  for (const row of rows) {
    if (!row.nomorRangka) continue;
    const group = rangkaGroups.get(row.nomorRangka) ?? [];
    group.push(row);
    rangkaGroups.set(row.nomorRangka, group);
  }

  for (const row of rows) {
    const rangkaGroup = rangkaGroups.get(row.nomorRangka);
    if (rangkaGroup && rangkaGroup.length > 1) {
      const others = rangkaGroup.filter(r => r !== row).map(r => r.nibar).join(', ');
      warn(row, `Nomor rangka "${row.nomorRangka}" juga dipakai oleh NIBAR: ${others}.`);
    }

    if (!row.nomorBpkb) {
      warn(row, 'Nomor BPKB kosong.');
    }

    if (row.masaBerlakuPajakIso && row.masaBerlakuPajakIso === row.masaBerlakuStnkIso) {
      warn(row, 'Masa berlaku pajak dan masa berlaku STNK sama persis — perlu verifikasi.');
    }

    if (row.masaBerlakuPajakIso) {
      const pajak = new Date(`${row.masaBerlakuPajakIso}T00:00:00Z`);
      if (pajak.getTime() < now.getTime()) {
        warn(row, `Masa pajak sudah lewat sejak ${row.masaBerlakuPajakIso}.`);
      }
    }

    if (row.tanggalPerolehanIso) {
      const perolehan = new Date(`${row.tanggalPerolehanIso}T00:00:00Z`);
      if (now.getTime() - perolehan.getTime() > DUA_PULUH_TAHUN_MS) {
        warn(row, 'Tahun perolehan lebih dari 20 tahun lalu — kondisi aset perlu diverifikasi manual.');
      }
    }
  }

  return issues;
}
