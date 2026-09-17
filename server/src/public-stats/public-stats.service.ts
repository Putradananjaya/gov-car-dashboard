import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { VehicleAssetEntity } from '../vehicle-asset/vehicle-asset.entity';
import { VehicleOperationalEntity } from '../vehicle-operational/vehicle-operational.entity';

export interface PublicStats {
  totalKendaraan: number;
  armadaSiapPakai: number;
  jumlahOpd: number;
  asetPajakKadaluarsa: number;
}

const AMBANG_KADALUARSA_HARI = 0;

@Injectable()
export class PublicStatsService {
  constructor(
    @InjectRepository(VehicleAssetEntity)
    private readonly assetRepository: Repository<VehicleAssetEntity>,
    @InjectRepository(VehicleOperationalEntity)
    private readonly operationalRepository: Repository<VehicleOperationalEntity>
  ) {}

  /** Statistik agregat untuk halaman publik (landing) — tanpa data sensitif per-unit. */
  async getStats(): Promise<PublicStats> {
    const aktif = await this.assetRepository.findBy({ dihapusPada: IsNull() });

    if (aktif.length === 0) {
      return { totalKendaraan: 0, armadaSiapPakai: 0, jumlahOpd: 0, asetPajakKadaluarsa: 0 };
    }

    const nibarAktif = aktif.map(a => a.nibar);
    const operational = await this.operationalRepository.findBy({ nibar: In(nibarAktif) });
    const armadaSiapPakai = operational.filter(o => o.status === 'Tersedia').length;

    const jumlahOpd = new Set(aktif.map(a => a.statusPenggunaan).filter(Boolean)).size;

    const now = new Date();
    const asetPajakKadaluarsa = aktif.filter(a => this.isPajakKadaluarsa(a.masaBerlakuPajak, now)).length;

    return { totalKendaraan: aktif.length, armadaSiapPakai, jumlahOpd, asetPajakKadaluarsa };
  }

  /** Meniru computeStatusPajak (src/app/shared/asset-grouping.ts) — status "kadaluarsa" saja yang relevan di sini. */
  private isPajakKadaluarsa(masaBerlakuPajak: string, now: Date): boolean {
    if (!masaBerlakuPajak) return false;
    const due = new Date(`${masaBerlakuPajak}T00:00:00Z`);
    if (Number.isNaN(due.getTime())) return false;
    const diffDays = (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    return diffDays < AMBANG_KADALUARSA_HARI;
  }
}
