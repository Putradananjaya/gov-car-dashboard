import { Component, EventEmitter, Input, OnChanges, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { VehicleAsset } from '../../../core/models/vehicle-asset.model';
import { KondisiAset, StatusOperasional, VehicleOperational } from '../../../core/models/vehicle-operational.model';
import { KNOWN_OPD_LIST } from '../../../shared/known-opd-list';

@Component({
  selector: 'app-asset-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './asset-form.html',
  standalone: true
})
export class AssetFormComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);

  /** null = mode tambah aset baru; diisi = mode edit aset yang sudah ada. */
  @Input() nibar: string | null = null;
  @Output() saved = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  public isEditMode = false;
  public form!: FormGroup;
  public isSaving = signal(false);
  public saveError = signal<string | null>(null);

  public opdList = KNOWN_OPD_LIST;
  public kondisiOptions: KondisiAset[] = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
  public statusOptions: StatusOperasional[] = ['Tersedia', 'Dipinjam', 'Servis', 'Tidak Layak'];

  ngOnInit(): void {
    this.buildForm();
    this.loadExisting();
  }

  ngOnChanges(): void {
    if (this.form) this.loadExisting();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      namaBarang: ['', Validators.required],
      spesifikasiNama: [''],
      spesifikasiLainnya: [''],
      merek: [''],
      tipe: [''],
      statusPenggunaan: ['', Validators.required],
      nomorPolisi: ['', Validators.required],
      nomorRangka: [''],
      nomorBpkb: [''],
      jumlah: [1, [Validators.required, Validators.min(1)]],
      satuan: ['unit', Validators.required],
      hargaSatuanPerolehan: [0, [Validators.required, Validators.min(0)]],
      nilaiPerolehan: [0, [Validators.required, Validators.min(0)]],
      caraPerolehan: ['Pengadaan APBD', Validators.required],
      tanggalPerolehan: ['', Validators.required],
      pemegang: [''],
      kondisi: ['Baik' as KondisiAset, Validators.required],
      status: ['Tersedia' as StatusOperasional, Validators.required],
      telepon: [''],
      catatan: ['']
    });
  }

  private loadExisting(): void {
    this.isEditMode = !!this.nibar;
    if (!this.nibar) return;

    const asset = this.assetRepository.findByNibar(this.nibar);
    const operational = this.operationalRepository.findByNibar(this.nibar);
    if (!asset) return;

    this.form.patchValue({
      namaBarang: asset.namaBarang,
      spesifikasiNama: asset.spesifikasiNama,
      spesifikasiLainnya: asset.spesifikasiLainnya,
      merek: asset.merek,
      tipe: asset.tipe,
      statusPenggunaan: asset.statusPenggunaan,
      nomorPolisi: asset.nomorPolisi,
      nomorRangka: asset.nomorRangka,
      nomorBpkb: asset.nomorBpkb ?? '',
      jumlah: asset.jumlah,
      satuan: asset.satuan,
      hargaSatuanPerolehan: asset.hargaSatuanPerolehan,
      nilaiPerolehan: asset.nilaiPerolehan,
      caraPerolehan: asset.caraPerolehan,
      tanggalPerolehan: asset.tanggalPerolehan,
      pemegang: asset.pemegang ?? '',
      kondisi: operational?.kondisi ?? 'Baik',
      status: operational?.status ?? 'Tersedia',
      telepon: operational?.telepon ?? '',
      catatan: operational?.catatan ?? ''
    });
  }

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    const values = this.form.value;
    const pemegang: string | null = values.pemegang?.trim() || null;
    const now = new Date().toISOString();

    const previousAsset = this.nibar ? this.assetRepository.findByNibar(this.nibar) : undefined;
    const nibar = this.nibar ?? this.generateManualNibar();

    const asset: VehicleAsset = {
      nibar,
      nomorRegister: previousAsset?.nomorRegister ?? '',
      kodeBarang: previousAsset?.kodeBarang ?? { akun: '', kelompok: '', jenis: '', objek: '', rincianObjek: '', subRincian: '', subSub: '', full: '' },
      namaBarang: values.namaBarang,
      spesifikasiNama: values.spesifikasiNama,
      spesifikasiLainnya: values.spesifikasiLainnya,
      merekTipe: `${values.merek} ${values.tipe}`.trim(),
      merek: values.merek,
      tipe: values.tipe,
      lokasi: previousAsset?.lokasi ?? '',
      nomorPolisi: values.nomorPolisi,
      nomorRangka: values.nomorRangka,
      nomorBpkb: values.nomorBpkb?.trim() || null,
      jumlah: values.jumlah,
      satuan: values.satuan,
      hargaSatuanPerolehan: values.hargaSatuanPerolehan,
      nilaiPerolehan: values.nilaiPerolehan,
      caraPerolehan: values.caraPerolehan,
      tanggalPerolehan: values.tanggalPerolehan,
      statusPenggunaan: values.statusPenggunaan,
      pemegang,
      isOperasionalBersama: !pemegang,
      fotoId: previousAsset?.fotoId ?? null,
      masaBerlakuPajak: previousAsset?.masaBerlakuPajak ?? '',
      masaBerlakuStnk: previousAsset?.masaBerlakuStnk ?? '',
      tahunAnggaran: previousAsset?.tahunAnggaran ?? new Date().getFullYear(),
      kodeLokasi: previousAsset?.kodeLokasi ?? '',
      sumberImporId: previousAsset?.sumberImporId ?? 'input-manual',
      dihapusPada: previousAsset?.dihapusPada ?? null
    };

    const operational: VehicleOperational = {
      nibar,
      kondisi: values.kondisi,
      status: values.status,
      penanggungJawabId: null,
      telepon: values.telepon?.trim() || null,
      telemetri: null,
      catatan: values.catatan ?? '',
      diperbaruiPada: now,
      diperbaruiOleh: this.actorLabel()
    };

    try {
      await Promise.all([this.assetRepository.upsert(asset), this.operationalRepository.upsert(operational)]);

      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: this.isEditMode ? 'ubah' : 'tambah',
        entitas: 'VehicleAsset',
        entitasId: nibar,
        nilaiLama: previousAsset,
        nilaiBaru: asset
      });

      this.saved.emit(nibar);
    } catch {
      this.saveError.set('Gagal menyimpan aset. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  /** NIBAR 45 karakter untuk aset baru yang didaftarkan manual (bukan lewat impor Excel). */
  private generateManualNibar(): string {
    const raw = `MANUAL${Date.now()}${Math.floor(Math.random() * 10000)}`;
    return raw.padEnd(45, '0').slice(0, 45);
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
