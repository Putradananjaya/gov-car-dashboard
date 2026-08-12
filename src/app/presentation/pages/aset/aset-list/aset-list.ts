import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { PermissionService } from '../../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../components/has-permission/has-permission.directive';
import { toVehicleView, VehicleView } from '../../../../core/adapters/vehicle-view.model';
import { AssetGroup, computeStatusPajak, groupAssetsByNamaBarang, StatusPajak } from '../../../../shared/asset-grouping';
import { KNOWN_OPD_LIST } from '../../../../shared/known-opd-list';
import { KondisiAset } from '../../../../core/models/vehicle-operational.model';

@Component({
  selector: 'app-aset-list',
  imports: [CommonModule, RouterLink, HasPermissionDirective],
  templateUrl: './aset-list.html',
  standalone: true
})
export class AsetListComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  public permissionService = inject(PermissionService);

  public searchQuery = signal('');
  public selectedKategori = signal('All');
  public selectedTahun = signal('All');
  public selectedKondisi = signal<'All' | KondisiAset>('All');
  public selectedStatusPajak = signal<'All' | StatusPajak>('All');
  public selectedNibars = signal<Set<string>>(new Set());

  private isAdmin = computed(() => this.authService.peran() === 'admin');
  private adminUnitKerja = computed(() => this.authService.currentUser()?.unitKerja ?? '');

  public opdList = KNOWN_OPD_LIST;
  public kondisiOptions: KondisiAset[] = ['Baik', 'Rusak Ringan', 'Rusak Berat'];

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const kondisi = params.get('kondisi');
      const statusPajak = params.get('statusPajak');
      this.selectedKondisi.set((kondisi as KondisiAset) ?? 'All');
      this.selectedStatusPajak.set((statusPajak as StatusPajak) ?? 'All');
    });
  }

  private allViews = computed<VehicleView[]>(() => {
    const operationalByNibar = new Map(this.operationalRepository.operational().map(o => [o.nibar, o]));
    const views: VehicleView[] = [];
    for (const asset of this.assetRepository.assets()) {
      if (asset.dihapusPada) continue;
      const operational = operationalByNibar.get(asset.nibar);
      if (!operational) continue;
      views.push(toVehicleView(asset, operational));
    }
    return views;
  });

  public scopedViews = computed<VehicleView[]>(() => {
    const views = this.allViews();
    if (this.isAdmin()) {
      return views.filter(v => v.statusPenggunaan === this.adminUnitKerja());
    }
    return views;
  });

  public kategoriList = computed(() => [...new Set(this.scopedViews().map(v => v.namaBarang))].sort());
  public tahunList = computed(() => [...new Set(this.scopedViews().map(v => v.tahunAnggaran))].sort((a, b) => b - a));

  public filteredViews = computed<VehicleView[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const kategori = this.selectedKategori();
    const tahun = this.selectedTahun();
    const kondisi = this.selectedKondisi();
    const statusPajak = this.selectedStatusPajak();

    return this.scopedViews().filter(v => {
      const matchesSearch =
        !query ||
        v.nomorPolisi.toLowerCase().includes(query) ||
        v.nibar.toLowerCase().includes(query) ||
        v.merek.toLowerCase().includes(query) ||
        v.tipe.toLowerCase().includes(query) ||
        (v.pemegang ?? '').toLowerCase().includes(query);

      const matchesKategori = kategori === 'All' || v.namaBarang === kategori;
      const matchesTahun = tahun === 'All' || String(v.tahunAnggaran) === tahun;
      const matchesKondisi = kondisi === 'All' || v.kondisi === kondisi;
      const matchesStatusPajak = statusPajak === 'All' || computeStatusPajak(v.masaBerlakuPajak) === statusPajak;

      return matchesSearch && matchesKategori && matchesTahun && matchesKondisi && matchesStatusPajak;
    });
  });

  public groups = computed<AssetGroup[]>(() => groupAssetsByNamaBarang(this.filteredViews()));

  public totalNilai = computed(() => this.filteredViews().reduce((sum, v) => sum + v.nilaiPerolehan, 0));

  computeStatusPajak = computeStatusPajak;

  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onKategoriChange(event: Event) {
    this.selectedKategori.set((event.target as HTMLSelectElement).value);
  }

  onTahunChange(event: Event) {
    this.selectedTahun.set((event.target as HTMLSelectElement).value);
  }

  onKondisiChange(event: Event) {
    this.selectedKondisi.set((event.target as HTMLSelectElement).value as 'All' | KondisiAset);
  }

  onStatusPajakChange(event: Event) {
    this.selectedStatusPajak.set((event.target as HTMLSelectElement).value as 'All' | StatusPajak);
  }

  toggleSelection(nibar: string) {
    const next = new Set(this.selectedNibars());
    if (next.has(nibar)) next.delete(nibar);
    else next.add(nibar);
    this.selectedNibars.set(next);
  }

  isSelected(nibar: string): boolean {
    return this.selectedNibars().has(nibar);
  }

  clearSelection() {
    this.selectedNibars.set(new Set());
  }

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  async bulkUbahKondisi(kondisi: KondisiAset) {
    const nibars = [...this.selectedNibars()];
    if (nibars.length === 0) return;

    for (const nibar of nibars) {
      const operational = this.operationalRepository.findByNibar(nibar);
      if (!operational) continue;
      await this.operationalRepository.upsert({ ...operational, kondisi, diperbaruiPada: new Date().toISOString(), diperbaruiOleh: this.actorLabel() });
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'ubah-kondisi-massal',
        entitas: 'VehicleOperational',
        entitasId: nibar,
        nilaiLama: operational.kondisi,
        nilaiBaru: kondisi
      });
    }
    this.clearSelection();
  }

  async bulkTetapkanPemegang(pemegang: string) {
    const nibars = [...this.selectedNibars()];
    if (nibars.length === 0) return;
    const trimmed = pemegang.trim();

    for (const nibar of nibars) {
      const asset = this.assetRepository.findByNibar(nibar);
      if (!asset) continue;
      await this.assetRepository.upsert({ ...asset, pemegang: trimmed || null, isOperasionalBersama: !trimmed });
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'tetapkan-pemegang-massal',
        entitas: 'VehicleAsset',
        entitasId: nibar,
        nilaiLama: asset.pemegang,
        nilaiBaru: trimmed || null
      });
    }
    this.clearSelection();
  }

  promptBulkUbahKondisi() {
    const value = prompt('Ubah kondisi menjadi (Baik / Rusak Ringan / Rusak Berat):');
    if (value && this.kondisiOptions.includes(value as KondisiAset)) {
      void this.bulkUbahKondisi(value as KondisiAset);
    }
  }

  promptBulkTetapkanPemegang() {
    const value = prompt('Tetapkan pemegang untuk aset terpilih (kosongkan untuk kendaraan operasional bersama):');
    if (value !== null) {
      void this.bulkTetapkanPemegang(value);
    }
  }

  async softDeleteAsset(nibar: string) {
    const alasan = prompt('Alasan penghapusan aset ini:');
    if (!alasan) return;

    await this.assetRepository.softDelete(nibar);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'hapus',
      entitas: 'VehicleAsset',
      entitasId: nibar,
      nilaiBaru: `Dihapus (soft delete). Alasan: ${alasan}`
    });
  }

  async removeAssetPermanently(nibar: string) {
    const confirmed = confirm('Aset akan dihapus PERMANEN dan tidak bisa dikembalikan. Lanjutkan?');
    if (!confirmed) return;

    await this.assetRepository.remove(nibar);
    await this.operationalRepository.remove(nibar);
    await this.auditRepository.append({
      pelakuId: this.actorId(),
      pelakuNama: this.actorLabel(),
      aksi: 'hapus-permanen',
      entitas: 'VehicleAsset',
      entitasId: nibar
    });
  }
}
