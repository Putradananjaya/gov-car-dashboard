import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    dihapusPada: null,
    ...ubah
  } as UserEntity;
}

type KriteriaUji = { id?: string; nip?: string; peran?: string; aktif?: boolean };

/**
 * Tiruan repository yang meniru satu sifat penting `@DeleteDateColumn`: baris
 * yang `dihapusPada`-nya terisi tidak terlihat oleh pembacaan biasa, dan hanya
 * muncul kalau diminta dengan `withDeleted`. Tanpa meniru itu, tes penghapusan
 * di bawah tidak benar-benar menguji apa pun.
 */
function buatService(awal: UserEntity[]) {
  const baris = new Map(awal.map(u => [u.id, u]));
  const terlihat = (u: UserEntity) => !u.dihapusPada;

  const cocok = (u: UserEntity, where: KriteriaUji) =>
    (where.id === undefined || u.id === where.id) &&
    (where.nip === undefined || u.nip === where.nip) &&
    (where.peran === undefined || u.peran === where.peran) &&
    (where.aktif === undefined || u.aktif === where.aktif);

  const repository = {
    baris,
    findOneBy: (where: KriteriaUji) =>
      Promise.resolve([...baris.values()].filter(terlihat).find(u => cocok(u, where)) ?? null),
    findOne: ({ where, withDeleted }: { where: KriteriaUji; withDeleted?: boolean }) =>
      Promise.resolve(
        [...baris.values()].filter(u => withDeleted || terlihat(u)).find(u => cocok(u, where)) ?? null
      ),
    // Satu-satunya pemanggil `find` dengan `withDeleted` adalah `findTerhapus`,
    // dan ia memang hanya meminta baris yang sudah dihapus.
    find: ({ withDeleted }: { withDeleted?: boolean } = {}) =>
      Promise.resolve([...baris.values()].filter(u => (withDeleted ? !terlihat(u) : terlihat(u)))),
    count: ({ where }: { where: KriteriaUji }) =>
      Promise.resolve([...baris.values()].filter(u => terlihat(u) && cocok(u, where)).length),
    save: (entity: UserEntity) => {
      baris.set(entity.id, entity);
      return Promise.resolve(entity);
    },
    softDelete: ({ id }: { id: string }) => {
      const target = baris.get(id);
      if (target) target.dihapusPada = new Date();
      return Promise.resolve({ affected: target ? 1 : 0 });
    },
    restore: ({ id }: { id: string }) => {
      const target = baris.get(id);
      if (target) target.dihapusPada = null;
      return Promise.resolve({ affected: target ? 1 : 0 });
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

describe('UserService.softDelete & restore', () => {
  it('menyembunyikan akun dari findAll tapi barisnya tetap ada', async () => {
    const { service, repository } = buatService([
      buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' }),
      buatPengguna('target', 'Sandi#2')
    ]);

    await service.softDelete('target', 'aktor');

    expect((await service.findAll()).map(u => u.id)).toEqual(['aktor']);
    expect(repository.baris.get('target')).toBeDefined();
    expect(repository.baris.get('target')!.dihapusPada).toBeInstanceOf(Date);
  });

  it('menampilkan akun terhapus di arsip, lengkap dengan waktu hapusnya', async () => {
    const { service } = buatService([
      buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' }),
      buatPengguna('target', 'Sandi#2')
    ]);

    await service.softDelete('target', 'aktor');
    const arsip = await service.findTerhapus();

    expect(arsip.map(u => u.id)).toEqual(['target']);
    expect(arsip[0].dihapusPada).toEqual(expect.any(String));
  });

  it('menolak menghapus akun milik aktor sendiri', async () => {
    const { service, repository } = buatService([buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' })]);

    await expect(service.softDelete('aktor', 'aktor')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.baris.get('aktor')!.dihapusPada).toBeFalsy();
  });

  it('menolak menghapus superadmin aktif yang terakhir', async () => {
    const { service, repository } = buatService([
      buatPengguna('aktor', 'Sandi#1', { peran: 'admin' }),
      buatPengguna('satu-satunya-superadmin', 'Sandi#2', { peran: 'superadmin' })
    ]);

    await expect(service.softDelete('satu-satunya-superadmin', 'aktor')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(repository.baris.get('satu-satunya-superadmin')!.dihapusPada).toBeFalsy();
  });

  it('mengizinkan menghapus superadmin saat masih ada superadmin aktif lain', async () => {
    const { service } = buatService([
      buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' }),
      buatPengguna('superadmin-lain', 'Sandi#2', { peran: 'superadmin' })
    ]);

    await expect(service.softDelete('superadmin-lain', 'aktor')).resolves.toMatchObject({
      id: 'superadmin-lain'
    });
  });

  it('memulihkan akun terhapus sehingga terbaca lagi', async () => {
    const { service } = buatService([
      buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' }),
      buatPengguna('target', 'Sandi#2')
    ]);
    await service.softDelete('target', 'aktor');

    await service.restore('target');

    expect((await service.findAll()).map(u => u.id).sort()).toEqual(['aktor', 'target']);
    expect(await service.findTerhapus()).toEqual([]);
  });

  it('menolak memulihkan akun yang tidak sedang terhapus', async () => {
    const { service } = buatService([buatPengguna('target', 'Sandi#2')]);

    await expect(service.restore('target')).rejects.toBeInstanceOf(BadRequestException);
  });

  /**
   * Kolom `nip` unique, jadi akun terhapus tetap memegang NIP-nya. Pesannya
   * harus menyebut arsip — kalau tidak, superadmin hanya melihat "NIP sudah
   * terdaftar" untuk akun yang tidak kelihatan di mana pun.
   */
  it('menolak NIP milik akun terhapus saat membuat akun baru, dan menunjuk ke arsip', async () => {
    const { service } = buatService([
      buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' }),
      buatPengguna('target', 'Sandi#2', { nip: '198301172010011019' })
    ]);
    await service.softDelete('target', 'aktor');

    await expect(
      service.create({
        nip: '198301172010011019',
        nama: 'Orang Baru',
        jabatan: 'Staf',
        unitKerja: 'Bidang Aset',
        peran: 'pegawai',
        password: 'SandiBaru#1'
      })
    ).rejects.toThrow(/sudah dihapus/);
  });

  it('melaporkan tidak ditemukan untuk id yang tidak ada sama sekali', async () => {
    const { service } = buatService([buatPengguna('aktor', 'Sandi#1', { peran: 'superadmin' })]);

    await expect(service.softDelete('hantu', 'aktor')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.restore('hantu')).rejects.toBeInstanceOf(NotFoundException);
  });
});
