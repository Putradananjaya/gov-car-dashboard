import { labelAksi, labelEntitas, nilaiTerbaca, ringkasPerubahan } from './audit-bahasa';

describe('audit-bahasa', () => {
  it('menerjemahkan aksi dan entitas ke bahasa sehari-hari', () => {
    expect(labelAksi('serah-terima-peminjaman')).toBe('Menyerahkan kendaraan & kunci');
    expect(labelEntitas('Loan')).toBe('Peminjaman');
  });

  it('tetap terbaca untuk aksi yang belum dipetakan', () => {
    expect(labelAksi('ubah-sesuatu-baru')).toBe('Ubah sesuatu baru');
  });

  it('masih mengenali istilah alur lama yang ada di data lama', () => {
    expect(labelAksi('setujui-tahap1-peminjaman')).toBe('Menyetujui peminjaman (alur lama)');
  });

  it('menampilkan perpindahan status sebagai panah', () => {
    expect(ringkasPerubahan('Berjalan', 'Selesai')).toEqual(['Berjalan → Selesai']);
  });

  it('hanya menyebut kolom yang benar-benar berubah', () => {
    const lama = { nama: 'Budi', jabatan: 'Staf', peran: 'pegawai' };
    const baru = { nama: 'Budi', jabatan: 'Staf', peran: 'admin' };

    expect(ringkasPerubahan(lama, baru)).toEqual(['Peran: Pemohon → Pengurus Barang (Admin)']);
  });

  it('meringkas pembuatan data baru dengan penanda yang dikenali', () => {
    const baru = { id: 'loan-123', keperluan: 'Rapat koordinasi', status: 'Diajukan', catatan: null };

    expect(ringkasPerubahan(undefined, baru)).toEqual(['Keperluan: Rapat koordinasi', 'Status: Diajukan']);
  });

  it('menerjemahkan status akun dan daftar peran', () => {
    expect(nilaiTerbaca(false)).toBe('Nonaktif');
    expect(nilaiTerbaca(['superadmin', 'admin'])).toBe('Kabid Aset (Superadmin), Pengurus Barang (Admin)');
    expect(nilaiTerbaca([])).toBe('Tidak ada');
  });
});
