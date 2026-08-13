import { ValidationIssue } from '../core/import/validators';
import { buildValidationReportText } from './validation-report';

function issue(overrides: Partial<ValidationIssue> = {}): ValidationIssue {
  return { level: 'error', rowNumber: 21, nibar: '1'.repeat(45), message: 'Contoh pesan', ...overrides };
}

describe('buildValidationReportText', () => {
  it('reports "(tidak ada)" when there are no errors or warnings', () => {
    const report = buildValidationReportText([], []);
    expect(report).toContain('GALAT (baris ditolak): 0');
    expect(report).toContain('PERINGATAN (baris masuk, perlu verifikasi manual): 0');
    expect(report.match(/\(tidak ada\)/g)?.length).toBe(2);
  });

  it('lists each error with its row number and message', () => {
    const report = buildValidationReportText([issue({ rowNumber: 23, message: 'NIBAR kosong.' })], []);
    expect(report).toContain('Baris 23');
    expect(report).toContain('NIBAR kosong.');
  });

  it('lists each warning separately from errors', () => {
    const report = buildValidationReportText([], [issue({ level: 'warning', rowNumber: 34, message: 'BPKB kosong.' })]);
    expect(report).toContain('GALAT (baris ditolak): 0');
    expect(report).toContain('PERINGATAN (baris masuk, perlu verifikasi manual): 1');
    expect(report).toContain('Baris 34');
  });
});
