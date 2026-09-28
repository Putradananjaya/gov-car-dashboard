import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MAKS_UKURAN_PAKTA, PaktaIntegritasService } from './pakta-integritas.service';
import { PaktaIntegritasEntity } from './pakta-integritas.entity';
import { VehicleAssetEntity } from '../vehicle-asset/vehicle-asset.entity';
import { UpsertPaktaIntegritasDto } from './dto/upsert-pakta-integritas.dto';

function buatAset(nibar: string, ubah: Partial<VehicleAssetEntity> = {}): VehicleAssetEntity {
  return { nibar, pemegang: 'I Wayan Budi', isOperasionalBersama: false, dihapusPada: null, ...ubah } as VehicleAssetEntity;
}

function buatService(aset: VehicleAssetEntity[]) {
  const baris = new Map<string, PaktaIntegritasEntity>();
  const asetPerNibar = new Map(aset.map(a => [a.nibar, a]));
  const repository = {
    baris,
    save: (entity: PaktaIntegritasEntity) => {
      baris.set(entity.nibar, entity);
      return Promise.resolve(entity);
    }
  };
  const assetRepository = {
    findOneBy: ({ nibar }: { nibar: string }) => Promise.resolve(asetPerNibar.get(nibar) ?? null)
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { service: new PaktaIntegritasService(repository as any, assetRepository as any), repository };
}

function berkas(isi: Buffer): UpsertPaktaIntegritasDto {
  return { fileName: 'pakta.pdf', mimeType: 'application/pdf', blobBase64: isi.toString('base64'), diunggahOleh: 'Pengurus Barang' };
}

describe('PaktaIntegritasService.upsert', () => {
  it('menyimpan berkas dengan nama pemegang dari data aset dan ukuran dari isi berkas', async () => {
    const { service, repository } = buatService([buatAset('nibar-1')]);

    const hasil = await service.upsert('nibar-1', berkas(Buffer.from('isi-pdf')));

    expect(hasil.pemegang).toBe('I Wayan Budi');
    expect(hasil.size).toBe(7);
    expect(hasil).not.toHaveProperty('blob');
    expect(repository.baris.get('nibar-1')!.blob.toString()).toBe('isi-pdf');
  });

  it('menolak kendaraan operasional bersama', async () => {
    const { service, repository } = buatService([buatAset('nibar-1', { pemegang: null, isOperasionalBersama: true })]);

    await expect(service.upsert('nibar-1', berkas(Buffer.from('x')))).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.baris.size).toBe(0);
  });

  it('menolak aset yang tidak ada atau sudah dihapus', async () => {
    const { service } = buatService([buatAset('dihapus', { dihapusPada: '2026-01-01T00:00:00.000Z' })]);

    await expect(service.upsert('tidak-ada', berkas(Buffer.from('x')))).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.upsert('dihapus', berkas(Buffer.from('x')))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak berkas kosong dan berkas di atas 5MB', async () => {
    const { service, repository } = buatService([buatAset('nibar-1')]);

    await expect(service.upsert('nibar-1', berkas(Buffer.alloc(0)))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upsert('nibar-1', berkas(Buffer.alloc(MAKS_UKURAN_PAKTA + 1)))).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.baris.size).toBe(0);
  });
});
