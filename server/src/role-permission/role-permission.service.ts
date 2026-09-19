import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Peran } from '../user/user.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { Kemampuan, MATRIKS_BAWAAN, SEMUA_KEMAMPUAN, SEMUA_PERAN, adalahKemampuan } from './kemampuan';

export type MatriksHakAkses = Record<Kemampuan, Peran[]>;

@Injectable()
export class RolePermissionService implements OnModuleInit {
  private readonly logger = new Logger(RolePermissionService.name);

  /**
   * IzinGuard memanggil matriks ini pada setiap permintaan terjaga, jadi
   * hasilnya disimpan di memori dan hanya dibaca ulang dari database saat
   * matriksnya diubah. Aplikasi ini berjalan sebagai satu proses Node
   * (cPanel Node.js Selector), jadi cache proses sudah memadai.
   */
  private cache: MatriksHakAkses | null = null;

  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly repository: Repository<RolePermissionEntity>
  ) {}

  /** Lengkapi baris yang belum ada — pola yang sama dengan provisioning akun baku. */
  async onModuleInit(): Promise<void> {
    let dibuat = 0;

    for (const kemampuan of SEMUA_KEMAMPUAN) {
      const sudahAda = await this.repository.findOneBy({ kemampuan });
      if (sudahAda) continue;

      await this.repository.save({ kemampuan, peran: MATRIKS_BAWAAN[kemampuan] });
      dibuat++;
    }

    if (dibuat > 0) {
      this.logger.log(`Matriks hak akses: ${dibuat} kemampuan baru diisi dengan nilai bawaan.`);
    }
    this.cache = null;
  }

  async getMatriks(): Promise<MatriksHakAkses> {
    if (this.cache) return this.cache;

    const baris = await this.repository.find();
    const tersimpan = new Map(baris.map(b => [b.kemampuan, b.peran]));

    // Selalu dibangun dari SEMUA_KEMAMPUAN supaya kemampuan yang baru
    // ditambahkan di kode tetap punya nilai walau barisnya belum sempat dibuat.
    const matriks = {} as MatriksHakAkses;
    for (const kemampuan of SEMUA_KEMAMPUAN) {
      matriks[kemampuan] = this.denganSuperadmin(tersimpan.get(kemampuan) ?? MATRIKS_BAWAAN[kemampuan]);
    }

    this.cache = matriks;
    return matriks;
  }

  async simpan(masukan: Record<string, string[]>): Promise<MatriksHakAkses> {
    for (const kemampuan of SEMUA_KEMAMPUAN) {
      const diminta = masukan[kemampuan];
      if (!diminta) continue;

      const peran = this.denganSuperadmin(
        diminta.filter((p): p is Peran => SEMUA_PERAN.includes(p as Peran))
      );
      await this.repository.save({ kemampuan, peran });
    }

    this.cache = null;
    return this.getMatriks();
  }

  async boleh(peran: Peran | undefined, kemampuan: Kemampuan[]): Promise<boolean> {
    if (!peran) return false;
    // Superadmin dikunci penuh — tidak bisa mencabut haknya sendiri lalu
    // terkunci dari sistem tanpa jalan pulih selain lewat database.
    if (peran === 'superadmin') return true;

    const matriks = await this.getMatriks();
    return kemampuan.some(k => adalahKemampuan(k) && matriks[k].includes(peran));
  }

  /** Superadmin selalu ada di setiap baris, berapa pun isi kiriman dari klien. */
  private denganSuperadmin(peran: Peran[]): Peran[] {
    const unik = new Set<Peran>(peran);
    unik.add('superadmin');
    return SEMUA_PERAN.filter(p => unik.has(p));
  }
}
