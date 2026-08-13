import { ValidationIssue } from '../core/import/validators';

/** Bangun teks log galat & peringatan hasil impor — dipakai untuk diunduh dari wizard. */
export function buildValidationReportText(errors: ValidationIssue[], warnings: ValidationIssue[]): string {
  const lines: string[] = ['LAPORAN VALIDASI IMPOR e-BMD', ''];

  lines.push(`=== GALAT (baris ditolak): ${errors.length} ===`);
  if (errors.length === 0) {
    lines.push('(tidak ada)');
  } else {
    for (const issue of errors) {
      lines.push(`Baris ${issue.rowNumber} (NIBAR ${issue.nibar || '-'}): ${issue.message}`);
    }
  }

  lines.push('', `=== PERINGATAN (baris masuk, perlu verifikasi manual): ${warnings.length} ===`);
  if (warnings.length === 0) {
    lines.push('(tidak ada)');
  } else {
    for (const issue of warnings) {
      lines.push(`Baris ${issue.rowNumber} (NIBAR ${issue.nibar || '-'}): ${issue.message}`);
    }
  }

  return lines.join('\n');
}
