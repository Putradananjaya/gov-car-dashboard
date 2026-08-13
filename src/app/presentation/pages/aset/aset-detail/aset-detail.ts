import { Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { ServiceRepository } from '../../../../core/repositories/service.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { PhotoRepository } from '../../../../core/repositories/photo.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { PermissionService } from '../../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../components/has-permission/has-permission.directive';
import { AssetFormComponent } from '../../../components/asset-form/asset-form';
import { toVehicleView } from '../../../../core/adapters/vehicle-view.model';
import { computeStatusPajak } from '../../../../shared/asset-grouping';
import { ServiceRecord } from '../../../../core/models/service-record.model';

type Tab = 'identitas' | 'legalitas' | 'servis' | 'peminjaman' | 'foto' | 'audit';

@Component({
  selector: 'app-aset-detail',
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, AssetFormComponent],
  templateUrl: './aset-detail.html',
  standalone: true
})
export class AsetDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private serviceRepository = inject(ServiceRepository);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private photoRepository = inject(PhotoRepository);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  public permissionService = inject(PermissionService);

  public nibar = signal('');
  public activeTab = signal<Tab>('identitas');
  public showEditForm = signal(false);
  public showAddServiceForm = signal(false);

  public legalitasForm!: FormGroup;
  public serviceForm!: FormGroup;

  computeStatusPajak = computeStatusPajak;

  public asset = computed(() => this.assetRepository.findByNibar(this.nibar()));
  public operational = computed(() => this.operationalRepository.findByNibar(this.nibar()));
  public view = computed(() => {
    const asset = this.asset();
    const operational = this.operational();
    return asset && operational ? toVehicleView(asset, operational) : null;
  });

  public serviceRecords = computed<ServiceRecord[]>(() =>
    this.serviceRepository.records().filter(r => r.nibar === this.nibar()).sort((a, b) => b.tahun - a.tahun)
  );

  public loans = computed(() => this.loanRepository.loans().filter(l => l.nibar === this.nibar()));

  public auditEntries = computed(() =>
    this.auditRepository.entries()
      .filter(e => e.entitasId === this.nibar())
      .slice()
      .sort((a, b) => b.waktu.localeCompare(a.waktu))
  );

  private photoBlob = computed(() => this.photoRepository.findByNibar(this.nibar())?.blob ?? null);
  /** Dicabut (revokeObjectURL) tiap kali foto berganti & saat komponen dihancurkan (dokumen v2 bag. 4.4). */
  public photoUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const blob = this.photoBlob();
      const previousUrl = untracked(() => this.photoUrl());
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      this.photoUrl.set(blob ? URL.createObjectURL(blob) : null);
    });

    this.destroyRef.onDestroy(() => {
      const url = this.photoUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.nibar.set(params.get('nibar') ?? '');
      this.initLegalitasForm();
    });

    this.serviceForm = this.fb.group({
      tahun: [new Date().getFullYear(), Validators.required],
      uraian: ['', Validators.required],
      odometerKm: [null],
      biaya: [null],
      tanggal: ['']
    });
  }

  private initLegalitasForm(): void {
    const asset = this.asset();
    this.legalitasForm = this.fb.group({
      masaBerlakuPajak: [asset?.masaBerlakuPajak ?? '', Validators.required],
      masaBerlakuStnk: [asset?.masaBerlakuStnk ?? '', Validators.required]
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  async saveLegalitas(): Promise<void> {
    if (this.legalitasForm.invalid) {
      this.legalitasForm.markAllAsTouched();
      return;
    }
    const asset = this.asset();
    if (!asset) return;

    const { masaBerlakuPajak, masaBerlakuStnk } = this.legalitasForm.value;
    const updated = { ...asset, masaBerlakuPajak, masaBerlakuStnk };
    await this.assetRepository.upsert(updated);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'ubah-legalitas',
      entitas: 'VehicleAsset',
      entitasId: this.nibar(),
      nilaiLama: { masaBerlakuPajak: asset.masaBerlakuPajak, masaBerlakuStnk: asset.masaBerlakuStnk },
      nilaiBaru: { masaBerlakuPajak, masaBerlakuStnk }
    });
  }

  async addServiceRecord(): Promise<void> {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }
    const values = this.serviceForm.value;
    const record: ServiceRecord = {
      id: `${this.nibar()}-manual-${Date.now()}`,
      nibar: this.nibar(),
      tahun: values.tahun,
      uraian: values.uraian,
      odometerKm: values.odometerKm || null,
      biaya: values.biaya || null,
      tanggal: values.tanggal || null,
      sumber: 'input-manual'
    };
    await this.serviceRepository.upsert(record);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'tambah-servis',
      entitas: 'ServiceRecord',
      entitasId: record.id,
      nilaiBaru: record
    });
    this.serviceForm.reset({ tahun: new Date().getFullYear() });
    this.showAddServiceForm.set(false);
  }

  onAssetSaved(): void {
    this.showEditForm.set(false);
    this.initLegalitasForm();
  }

  goBack(): void {
    this.router.navigate(['/app/aset']);
  }
}
