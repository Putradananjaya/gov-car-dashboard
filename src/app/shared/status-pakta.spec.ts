import { statusPakta } from './status-pakta';
import { PaktaIntegritas } from '../core/models/pakta-integritas.model';

const pakta: PaktaIntegritas = {
  nibar: 'n1',
  pemegang: 'I Wayan Budi',
  fileName: 'pakta.pdf',
  mimeType: 'application/pdf',
  size: 10,
  diunggahPada: '2026-09-01T00:00:00.000Z',
  diunggahOleh: 'Pengurus Barang'
};

describe('statusPakta', () => {
  it('tidak perlu untuk kendaraan operasional bersama', () => {
    expect(statusPakta({ pemegang: null, isOperasionalBersama: true }, pakta)).toBe('tidak-perlu');
  });

  it('belum ada bila kendaraan perorangan belum punya pakta', () => {
    expect(statusPakta({ pemegang: 'I Wayan Budi', isOperasionalBersama: false }, undefined)).toBe('belum-ada');
  });

  it('ada bila pakta atas nama pemegang saat ini', () => {
    expect(statusPakta({ pemegang: 'I Wayan Budi', isOperasionalBersama: false }, pakta)).toBe('ada');
  });

  it('pemegang berganti bila pakta atas nama pemegang lama', () => {
    expect(statusPakta({ pemegang: 'Ni Made Sari', isOperasionalBersama: false }, pakta)).toBe('pemegang-berganti');
  });
});
