import { RolePermissionService } from './role-permission.service';
import { RolePermissionEntity } from './role-permission.entity';
import { MATRIKS_BAWAAN, SEMUA_KEMAMPUAN } from './kemampuan';

function buatRepositoryPalsu(awal: RolePermissionEntity[] = []) {
  const baris = new Map(awal.map(b => [b.kemampuan, b]));
  return {
    baris,
    findOneBy: ({ kemampuan }: { kemampuan: string }) => Promise.resolve(baris.get(kemampuan) ?? null),
    find: () => Promise.resolve([...baris.values()]),
    save: (entity: RolePermissionEntity) => {
      baris.set(entity.kemampuan, entity);
      return Promise.resolve(entity);
    }
  };
}

function buatService(awal: RolePermissionEntity[] = []) {
  const repository = buatRepositoryPalsu(awal);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new RolePermissionService(repository as any);
  return { service, repository };
}

describe('RolePermissionService', () => {
  it('mengisi seluruh kemampuan dengan nilai bawaan saat boot pertama', async () => {
    const { service, repository } = buatService();

    await service.onModuleInit();

    expect(repository.baris.size).toBe(SEMUA_KEMAMPUAN.length);
    expect(repository.baris.get('audit.lihat')?.peran).toEqual(MATRIKS_BAWAAN['audit.lihat']);
  });

  it('tidak menimpa baris yang sudah disunting superadmin', async () => {
    const { service, repository } = buatService([
      { kemampuan: 'aset.lihat', peran: ['superadmin', 'admin', 'pegawai'] }
    ]);

    await service.onModuleInit();

    expect(repository.baris.get('aset.lihat')?.peran).toEqual(['superadmin', 'admin', 'pegawai']);
  });

  it('memaksa superadmin tetap ada walau klien tidak mengirimnya', async () => {
    const { service } = buatService();
    await service.onModuleInit();

    const matriks = await service.simpan({ 'pengguna.kelola': [], 'audit.lihat': ['admin'] });

    expect(matriks['pengguna.kelola']).toEqual(['superadmin']);
    expect(matriks['audit.lihat']).toEqual(['superadmin', 'admin']);
  });

  it('membuang peran yang tidak dikenal dan kunci kemampuan asing', async () => {
    const { service, repository } = buatService();
    await service.onModuleInit();

    const matriks = await service.simpan({
      'aset.ubah': ['admin', 'dewa', 'pegawai'],
      'kemampuan.tidak.ada': ['admin']
    });

    expect(matriks['aset.ubah']).toEqual(['superadmin', 'admin', 'pegawai']);
    expect(repository.baris.has('kemampuan.tidak.ada')).toBe(false);
  });

  it('selalu mengizinkan superadmin walau barisnya dikosongkan', async () => {
    const { service } = buatService();
    await service.onModuleInit();
    await service.simpan({ 'sistem.resetBasisData': [] });

    await expect(service.boleh('superadmin', ['sistem.resetBasisData'])).resolves.toBe(true);
    await expect(service.boleh('admin', ['sistem.resetBasisData'])).resolves.toBe(false);
  });

  it('cukup salah satu kemampuan terpenuhi', async () => {
    const { service } = buatService();
    await service.onModuleInit();

    await expect(
      service.boleh('pejabat_penatausahaan', ['peminjaman.verifikasi', 'peminjaman.setujui'])
    ).resolves.toBe(true);
    await expect(service.boleh('pejabat_penatausahaan', ['peminjaman.verifikasi'])).resolves.toBe(false);
    await expect(service.boleh(undefined, ['peminjaman.setujui'])).resolves.toBe(false);
  });

  it('membagi aktor peminjaman sesuai kolom Pelaksana pada SOP', async () => {
    const { service } = buatService();
    await service.onModuleInit();

    // Langkah 2 & 4/6 — Pengurus Barang; langkah 3 — Pejabat Penatausahaan.
    await expect(service.boleh('admin', ['peminjaman.verifikasi'])).resolves.toBe(true);
    await expect(service.boleh('admin', ['peminjaman.serahTerima'])).resolves.toBe(true);
    await expect(service.boleh('admin', ['peminjaman.setujui'])).resolves.toBe(false);

    await expect(service.boleh('pejabat_penatausahaan', ['peminjaman.setujui'])).resolves.toBe(true);
    await expect(service.boleh('pejabat_penatausahaan', ['peminjaman.serahTerima'])).resolves.toBe(false);
  });

  it('melengkapi kemampuan yang barisnya belum ada dengan nilai bawaan', async () => {
    const { service } = buatService([{ kemampuan: 'aset.lihat', peran: ['superadmin'] }]);

    const matriks = await service.getMatriks();

    expect(matriks['aset.lihat']).toEqual(['superadmin']);
    expect(matriks['laporan.cetak']).toEqual(MATRIKS_BAWAAN['laporan.cetak']);
  });
});
