import { UnauthorizedException } from '@nestjs/common';
import { compareSync, hashSync } from 'bcryptjs';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';

function buatPengguna(id: string, sandi: string, ubah: Partial<UserEntity> = {}): UserEntity {
  return {
    id,
    nip: `nip-${id}`,
    nama: `Pengguna ${id}`,
    jabatan: 'Jabatan',
    unitKerja: 'Unit',
    peran: 'pegawai',
    aktif: true,
    passwordHash: hashSync(sandi, 10),
    terakhirMasuk: null,
    ...ubah
  } as UserEntity;
}

function buatService(awal: UserEntity[]) {
  const baris = new Map(awal.map(u => [u.id, u]));
  const repository = {
    baris,
    findOneBy: ({ id, nip }: { id?: string; nip?: string }) =>
      Promise.resolve(
        id ? (baris.get(id) ?? null) : ([...baris.values()].find(u => u.nip === nip) ?? null)
      ),
    save: (entity: UserEntity) => {
      baris.set(entity.id, entity);
      return Promise.resolve(entity);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { service: new UserService(repository as any), repository };
}

describe('UserService.resetPassword', () => {
  const SANDI_SUPERADMIN = 'Superadmin#123';

  it('mengganti kata sandi target saat kata sandi superadmin benar', async () => {
    const { service, repository } = buatService([
      buatPengguna('aktor', SANDI_SUPERADMIN, { peran: 'superadmin' }),
      buatPengguna('target', 'SandiLama#1')
    ]);

    await service.resetPassword('target', { kataSandiLama: SANDI_SUPERADMIN, password: 'SandiBaru#2' }, 'aktor');

    expect(compareSync('SandiBaru#2', repository.baris.get('target')!.passwordHash)).toBe(true);
  });

  it('menolak dan tidak mengubah apa pun saat kata sandi superadmin salah', async () => {
    const { service, repository } = buatService([
      buatPengguna('aktor', SANDI_SUPERADMIN, { peran: 'superadmin' }),
      buatPengguna('target', 'SandiLama#1')
    ]);
    const hashSebelum = repository.baris.get('target')!.passwordHash;

    await expect(
      service.resetPassword('target', { kataSandiLama: 'salah-total', password: 'SandiBaru#2' }, 'aktor')
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.baris.get('target')!.passwordHash).toBe(hashSebelum);
  });

  it('memeriksa kata sandi aktor, bukan kata sandi pengguna yang disetel ulang', async () => {
    const { service } = buatService([
      buatPengguna('aktor', SANDI_SUPERADMIN, { peran: 'superadmin' }),
      buatPengguna('target', 'SandiLama#1')
    ]);

    // Mengirim sandi milik target harus tetap ditolak.
    await expect(
      service.resetPassword('target', { kataSandiLama: 'SandiLama#1', password: 'SandiBaru#2' }, 'aktor')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('menolak saat akun aktor sudah dinonaktifkan', async () => {
    const { service } = buatService([
      buatPengguna('aktor', SANDI_SUPERADMIN, { peran: 'superadmin', aktif: false }),
      buatPengguna('target', 'SandiLama#1')
    ]);

    await expect(
      service.resetPassword('target', { kataSandiLama: SANDI_SUPERADMIN, password: 'SandiBaru#2' }, 'aktor')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
