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
import { TanggalIdPipe } from '../../../../shared/pipes/tanggal-id.pipe';
import { PaktaIntegritasRepository } from '../../../../core/repositories/pakta-integritas.repository';
import { PaktaIntegritas } from '../../../../core/models/pakta-integritas.model';

const MAX_UKURAN_PAKTA = 5 * 1024 * 1024; // 5MB — sama dengan batas di server
const TIPE_PAKTA_DIIZINKAN = ['application/pdf', 'image/jpeg', 'image/png'];

@Component({
  selector: 'app-aset-list',
  imports: [CommonModule, RouterLink, HasPermissionDirective, TanggalIdPipe],
  templateUrl: './aset-list.html',
  standalone: true
})
export class AsetListComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private auditRepository = inject(AuditRepository);
  private paktaRepository = inject(PaktaIntegritasRepository);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  public permissionService = inject(PermissionService);

  public searchQuery = signal('');
  public selectedKategori = signal('All');
  public selectedTahun = signal('All');
  public selectedKondisi = signal<'All' | KondisiAset>('All');
  public selectedStatusPajak = signal<'All' | StatusPajak>('All');
  public selectedNibars = signal<Set<string>>(new Set());
  /** NIBAR yang pakta integritasnya sedang diunggah/dibuka/dihapus — tombolnya dinonaktifkan sementara. */
  public paktaSedangDiproses = signal<string | null>(null);


  public opdList = KNOWN_OPD_LIST;
  public kondisiOptions: KondisiAset[] = ['Baik', 'Rusak Ringan', 'Rusak Berat'];

  constructor() {
    void this.paktaRepository.refresh();

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

  // Pengurus Barang mengelola seluruh kendaraan dinas — lihat catatan di persetujuan.ts.
  public scopedViews = computed<VehicleView[]>(() => this.allViews());

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

  private paktaPerNibar = computed(() => new Map(this.paktaRepository.pakta().map(p => [p.nibar, p])));

  paktaUntuk(nibar: string): PaktaIntegritas | undefined {
    return this.paktaPerNibar().get(nibar);
  }

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

    try {
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
    } catch (error) {
      console.error('Gagal mengubah kondisi massal:', error);
      alert('Gagal mengubah kondisi — sebagian mungkin sudah tersimpan. Periksa daftar aset dan coba lagi.');
    }
  }

  async bulkTetapkanPemegang(pemegang: string) {
    const nibars = [...this.selectedNibars()];
    if (nibars.length === 0) return;
    const trimmed = pemegang.trim();

    try {
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
    } catch (error) {
      console.error('Gagal menetapkan pemegang massal:', error);
      alert('Gagal menetapkan pemegang — sebagian mungkin sudah tersimpan. Periksa daftar aset dan coba lagi.');
    }
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

  async unggahPakta(v: VehicleView, event: Event) {
    const input = event.target as HTMLInputElement;
    const berkas = input.files?.[0];
    // Dikosongkan supaya memilih berkas yang sama lagi tetap memicu (change).
    input.value = '';
    if (!berkas) return;

    if (!TIPE_PAKTA_DIIZINKAN.includes(berkas.type)) {
      alert('Format berkas pakta integritas harus PDF, JPG, atau PNG.');
      return;
    }
    if (berkas.size > MAX_UKURAN_PAKTA) {
      alert('Ukuran berkas pakta integritas melebihi 5 MB.');
      return;
    }

    const lama = this.paktaUntuk(v.nibar);
    this.paktaSedangDiproses.set(v.nibar);
    try {
      await this.paktaRepository.upsert(v.nibar, berkas, this.actorLabel());
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'unggah-pakta-integritas',
        entitas: 'PaktaIntegritas',
        entitasId: v.nibar,
        nilaiLama: lama ? lama.fileName : null,
        nilaiBaru: `${berkas.name} (pemegang: ${v.pemegang})`
      });
    } catch (error) {
      console.error('Gagal mengunggah pakta integritas:', error);
      alert('Gagal mengunggah pakta integritas. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.paktaSedangDiproses.set(null);
    }
  }

  async lihatPakta(nibar: string) {
    // Tab dibuka lebih dulu (masih dalam klik pengguna) supaya tidak diblokir
    // pemblokir pop-up; isinya diisi setelah berkas selesai diambil.
    const tab = window.open('', '_blank');
    this.paktaSedangDiproses.set(nibar);
    try {
      const url = URL.createObjectURL(await this.paktaRepository.ambilBerkas(nibar));
      if (tab) {
        tab.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = this.paktaUntuk(nibar)?.fileName ?? `pakta-integritas-${nibar}`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      tab?.close();
      console.error('Gagal membuka pakta integritas:', error);
      alert('Gagal membuka pakta integritas. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.paktaSedangDiproses.set(null);
    }
  }

  async hapusPakta(nibar: string) {
    const pakta = this.paktaUntuk(nibar);
    if (!pakta) return;
    if (!confirm(`Hapus pakta integritas atas nama ${pakta.pemegang}?`)) return;

    this.paktaSedangDiproses.set(nibar);
    try {
      await this.paktaRepository.remove(nibar);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'hapus-pakta-integritas',
        entitas: 'PaktaIntegritas',
        entitasId: nibar,
        nilaiLama: `${pakta.fileName} (pemegang: ${pakta.pemegang})`
      });
    } catch (error) {
      console.error('Gagal menghapus pakta integritas:', error);
      alert('Gagal menghapus pakta integritas. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.paktaSedangDiproses.set(null);
    }
  }

  /**
   * Satu-satunya cara menghapus aset di aplikasi ini. Barisnya tetap ada di
   * basis data — yang hilang hanya kemunculannya di daftar — supaya nilai
   * perolehan BMD tetap bisa ditelusuri sesudah kendaraannya dihapuskan.
   */
  async softDeleteAsset(nibar: string) {
    const alasan = prompt('Alasan penghapusan aset ini:');
    if (!alasan) return;

    try {
      await this.assetRepository.softDelete(nibar);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'hapus',
        entitas: 'VehicleAsset',
        entitasId: nibar,
        nilaiBaru: `Dihapus dari daftar. Alasan: ${alasan}`
      });
    } catch (error) {
      console.error('Gagal menghapus aset:', error);
      alert('Gagal menghapus aset. Periksa koneksi Anda dan coba lagi.');
    }
  }
}
