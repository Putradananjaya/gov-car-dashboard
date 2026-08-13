import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { parseEbmdWorkbook, ParsedImportResult } from '../../../../core/import/ebmd-parser';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { ServiceRepository } from '../../../../core/repositories/service.repository';
import { ImportBatchRepository } from '../../../../core/repositories/import-batch.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { PhotoRepository } from '../../../../core/repositories/photo.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { VehicleAsset } from '../../../../core/models/vehicle-asset.model';
import { VehicleOperational } from '../../../../core/models/vehicle-operational.model';
import { ImportBatch } from '../../../../core/models/import-batch.model';
import { buildValidationReportText } from '../../../../shared/validation-report';
import { PhotoExtractorService } from '../../../../data/import/photo-extractor.service';

type Langkah = 1 | 2 | 3 | 4 | 5 | 6;
type ResolusiKonflik = 'lewati' | 'perbarui-semua' | 'perbarui-kosong';

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024;

const KOLOM_MAPPING_REFERENSI = [
  { kolom: 'A-F, H', field: 'Kode Barang (berjenjang)' },
  { kolom: 'I', field: 'Nama Barang' },
  { kolom: 'J', field: 'NIBAR (identitas utama)' },
  { kolom: 'K', field: 'Nomor Register' },
  { kolom: 'L / M', field: 'Spesifikasi Nama / Spesifikasi Lainnya' },
  { kolom: 'O', field: 'Merek/Tipe (mentah, lalu dipisah)' },
  { kolom: 'Q / R / S', field: 'Nomor Polisi / Rangka / BPKB' },
  { kolom: 'T / U', field: 'Jumlah / Satuan' },
  { kolom: 'W / X', field: 'Harga Satuan / Nilai Perolehan' },
  { kolom: 'Y / Z', field: 'Cara Perolehan / Tanggal Perolehan' },
  { kolom: 'AA / AC', field: 'Status Penggunaan (OPD) / Pemegang' },
  { kolom: 'AG / AI', field: 'Masa Berlaku Pajak / STNK' },
  { kolom: 'AK / AM', field: 'Riwayat Servis (uraian) / Biaya' }
];

@Component({
  selector: 'app-aset-impor',
  imports: [CommonModule],
  templateUrl: './aset-impor.html',
  standalone: true
})
export class AsetImporComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private serviceRepository = inject(ServiceRepository);
  private importBatchRepository = inject(ImportBatchRepository);
  private auditRepository = inject(AuditRepository);
  private photoRepository = inject(PhotoRepository);
  private photoExtractor = inject(PhotoExtractorService);
  private authService = inject(AuthService);
  private router = inject(Router);

  public photoProgressDone = this.photoExtractor.progressDone;
  public photoProgressTotal = this.photoExtractor.progressTotal;
  public isExtractingPhotos = signal(false);
  public photoExtractionError = signal<string | null>(null);
  public photosImportedCount = signal(0);

  public langkah = signal<Langkah>(1);
  public kolomMappingReferensi = KOLOM_MAPPING_REFERENSI;

  public selectedFile = signal<File | null>(null);
  public fileError = signal<string | null>(null);
  public isParsing = signal(false);

  public parseResult = signal<ParsedImportResult | null>(null);
  private fileBuffer: ArrayBuffer | null = null;
  private batchId = `import-${Date.now()}`;

  public resolutions = signal<Map<string, ResolusiKonflik>>(new Map());

  public isApplying = signal(false);
  public appliedBatch = signal<ImportBatch | null>(null);
  public isUndoing = signal(false);

  public formatTerdeteksi = computed(() => {
    const kop = this.parseResult()?.kop;
    return !!kop && !!kop.penggunaBarang && !!kop.kodeLokasi && kop.tahunAnggaran > 2000;
  });

  public conflictRows = computed<VehicleAsset[]>(() =>
    (this.parseResult()?.assets ?? []).filter(a => !!this.assetRepository.findByNibar(a.nibar))
  );

  public newRows = computed<VehicleAsset[]>(() =>
    (this.parseResult()?.assets ?? []).filter(a => !this.assetRepository.findByNibar(a.nibar))
  );

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set(null);
    this.selectedFile.set(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.fileError.set('Berkas harus berformat .xlsx.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set('Ukuran berkas melebihi 150MB.');
      return;
    }

    this.selectedFile.set(file);
  }

  async prosesBerkas(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.isParsing.set(true);
    try {
      const buffer = await file.arrayBuffer();
      this.fileBuffer = buffer;
      const result = parseEbmdWorkbook(buffer, { sumberImporId: this.batchId }, new Date());
      this.parseResult.set(result);
      this.langkah.set(2);
    } catch {
      this.fileError.set('Berkas tidak bisa dibaca — pastikan formatnya sesuai FORMAT II.O.2.2.');
    } finally {
      this.isParsing.set(false);
    }
  }

  lanjutKeLangkah(target: Langkah): void {
    if (target === 5) {
      const initial = new Map<string, ResolusiKonflik>();
      for (const row of this.conflictRows()) {
        initial.set(row.nibar, 'perbarui-semua');
      }
      this.resolutions.set(initial);
    }
    this.langkah.set(target);
  }

  kembaliKeLangkah(target: Langkah): void {
    this.langkah.set(target);
  }

  setResolution(nibar: string, value: ResolusiKonflik): void {
    const next = new Map(this.resolutions());
    next.set(nibar, value);
    this.resolutions.set(next);
  }

  getResolution(nibar: string): ResolusiKonflik {
    return this.resolutions().get(nibar) ?? 'perbarui-semua';
  }

  private mergeKeepingExistingNonEmpty(existing: VehicleAsset, incoming: VehicleAsset): VehicleAsset {
    const merged: VehicleAsset = { ...existing };
    for (const key of Object.keys(incoming) as (keyof VehicleAsset)[]) {
      if (key === 'kodeBarang') {
        if (!existing.kodeBarang.full) merged.kodeBarang = incoming.kodeBarang;
        continue;
      }
      const existingValue = existing[key];
      const isEmpty = existingValue === '' || existingValue === null || existingValue === undefined;
      if (isEmpty) {
        (merged as unknown as Record<string, unknown>)[key] = incoming[key];
      }
    }
    return merged;
  }

  private async extractPhotosByNibar(rowNumberByNibar: Record<string, number>): Promise<Map<string, Blob>> {
    const photoBlobByNibar = new Map<string, Blob>();
    if (!this.fileBuffer) return photoBlobByNibar;

    this.isExtractingPhotos.set(true);
    this.photoExtractionError.set(null);
    try {
      const photos = await this.photoExtractor.extractPhotos(this.fileBuffer);
      if (photos.length === 0) return photoBlobByNibar;

      const nibarByRowNumber = new Map<number, string>();
      for (const [nibar, rowNumber] of Object.entries(rowNumberByNibar)) {
        nibarByRowNumber.set(rowNumber, nibar);
      }

      for (const photo of photos) {
        const sheetRowNumber = photo.row + 1; // anchor OOXML 0-indexed -> nomor baris spreadsheet
        const nibar = nibarByRowNumber.get(sheetRowNumber);
        if (nibar) photoBlobByNibar.set(nibar, photo.blob);
      }
    } catch (error) {
      // Kegagalan ekstraksi foto tidak boleh menggagalkan impor data BMD —
      // data jauh lebih penting daripada foto (dokumen v2 bag. 8).
      this.photoExtractionError.set(error instanceof Error ? error.message : 'Ekstraksi foto gagal, dilewati.');
    } finally {
      this.isExtractingPhotos.set(false);
    }

    return photoBlobByNibar;
  }

  async terapkanImpor(): Promise<void> {
    const result = this.parseResult();
    if (!result) return;

    this.isApplying.set(true);

    const photoBlobByNibar = await this.extractPhotosByNibar(result.rowNumberByNibar);
    this.photosImportedCount.set(photoBlobByNibar.size);

    let jumlahDitambah = 0;
    let jumlahDiperbarui = 0;
    let jumlahDilewati = 0;
    const previousSnapshots: Record<string, VehicleAsset | null> = {};
    const now = new Date().toISOString();

    for (const incomingRaw of result.assets) {
      const photoBlob = photoBlobByNibar.get(incomingRaw.nibar);
      const incoming = photoBlob ? { ...incomingRaw, fotoId: incomingRaw.nibar } : incomingRaw;
      const existing = this.assetRepository.findByNibar(incoming.nibar);

      if (existing) {
        const resolution = this.getResolution(incoming.nibar);
        if (resolution === 'lewati') {
          jumlahDilewati++;
          continue;
        }

        const finalAsset = resolution === 'perbarui-kosong'
          ? this.mergeKeepingExistingNonEmpty(existing, incoming)
          : { ...incoming, dihapusPada: existing.dihapusPada };

        previousSnapshots[incoming.nibar] = existing;
        await this.assetRepository.upsert(finalAsset);
        if (photoBlob) await this.photoRepository.upsert({ nibar: incoming.nibar, blob: photoBlob });
        jumlahDiperbarui++;

        await this.auditRepository.append({
          pelakuId: this.actorId(),
          pelakuNama: this.actorLabel(),
          aksi: 'impor',
          entitas: 'VehicleAsset',
          entitasId: incoming.nibar,
          nilaiLama: existing,
          nilaiBaru: finalAsset
        });
      } else {
        previousSnapshots[incoming.nibar] = null;
        await this.assetRepository.upsert(incoming);
        if (photoBlob) await this.photoRepository.upsert({ nibar: incoming.nibar, blob: photoBlob });

        const operational: VehicleOperational = {
          nibar: incoming.nibar,
          kondisi: 'Baik',
          status: 'Tersedia',
          penanggungJawabId: null,
          telepon: null,
          telemetri: null,
          catatan: 'Dari impor Excel — kondisi perlu diverifikasi manual.',
          diperbaruiPada: now,
          diperbaruiOleh: this.actorLabel()
        };
        await this.operationalRepository.upsert(operational);
        jumlahDitambah++;

        await this.auditRepository.append({
          pelakuId: this.actorId(),
          pelakuNama: this.actorLabel(),
          aksi: 'impor',
          entitas: 'VehicleAsset',
          entitasId: incoming.nibar,
          nilaiBaru: incoming
        });
      }
    }

    for (const record of result.serviceRecords) {
      await this.serviceRepository.upsert(record);
    }

    const batch: ImportBatch = {
      batchId: this.batchId,
      waktu: now,
      namaBerkas: this.selectedFile()?.name ?? '',
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      jumlahDitambah,
      jumlahDiperbarui,
      jumlahDilewati,
      previousSnapshots,
      dibatalkan: false
    };
    await this.importBatchRepository.upsert(batch);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'terapkan-impor',
      entitas: 'ImportBatch',
      entitasId: batch.batchId,
      nilaiBaru: { jumlahDitambah, jumlahDiperbarui, jumlahDilewati }
    });

    this.appliedBatch.set(batch);
    this.isApplying.set(false);
    this.langkah.set(6);
  }

  downloadValidationReport(): void {
    const result = this.parseResult();
    if (!result) return;

    const text = buildValidationReportText(result.errors, result.warnings);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-validasi-impor-${this.batchId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async batalkanImpor(): Promise<void> {
    const batch = this.appliedBatch();
    if (!batch) return;

    const confirmed = confirm('Batalkan impor ini? Aset baru akan dihapus permanen, aset yang diperbarui akan dikembalikan ke kondisi sebelumnya.');
    if (!confirmed) return;

    this.isUndoing.set(true);

    for (const [nibar, snapshot] of Object.entries(batch.previousSnapshots)) {
      if (snapshot === null) {
        await this.assetRepository.remove(nibar);
        await this.operationalRepository.remove(nibar);
        await this.photoRepository.remove(nibar);
      } else {
        await this.assetRepository.upsert(snapshot);
      }
    }

    await this.importBatchRepository.upsert({ ...batch, dibatalkan: true });
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'batalkan-impor',
      entitas: 'ImportBatch',
      entitasId: batch.batchId
    });

    this.isUndoing.set(false);
    this.router.navigate(['/app/aset']);
  }

  selesai(): void {
    this.router.navigate(['/app/aset']);
  }
}
