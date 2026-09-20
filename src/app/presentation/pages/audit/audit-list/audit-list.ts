import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { TanggalIdPipe } from '../../../../shared/pipes/tanggal-id.pipe';
import { labelAksi, labelEntitas, ringkasPerubahan } from '../../../../shared/audit-bahasa';
import { AuditLog } from '../../../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-list',
  imports: [CommonModule, TanggalIdPipe],
  templateUrl: './audit-list.html',
  standalone: true
})
export class AuditListComponent {
  private auditRepository = inject(AuditRepository);

  public searchQuery = signal('');
  public selectedEntitas = signal('All');
  public selectedPelaku = signal('All');
  public dariTanggal = signal('');
  public sampaiTanggal = signal('');

  private sortedEntries = computed(() =>
    this.auditRepository.entries().slice().sort((a, b) => b.waktu.localeCompare(a.waktu))
  );

  public entitasList = computed(() => [...new Set(this.sortedEntries().map(e => e.entitas))].sort());
  public pelakuList = computed(() => [...new Set(this.sortedEntries().map(e => e.pelakuNama))].sort());

  public labelAksi = labelAksi;
  public labelEntitas = labelEntitas;

  public perubahan(entry: AuditLog): string[] {
    return ringkasPerubahan(entry.nilaiLama, entry.nilaiBaru);
  }

  /**
   * Nilai mentah tetap bisa dilihat lewat tooltip — ringkasannya untuk dibaca
   * sehari-hari, aslinya untuk kebutuhan pemeriksaan.
   */
  public rincianTeknis(entry: AuditLog): string {
    const potong = (nilai: unknown) => {
      if (nilai === undefined || nilai === null) return '—';
      return typeof nilai === 'string' ? nilai : JSON.stringify(nilai);
    };
    return [
      `Kode aksi: ${entry.aksi}`,
      `Rujukan: ${entry.entitasId}`,
      `Nilai lama: ${potong(entry.nilaiLama)}`,
      `Nilai baru: ${potong(entry.nilaiBaru)}`
    ].join('\n');
  }

  public filteredEntries = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const entitas = this.selectedEntitas();
    const pelaku = this.selectedPelaku();
    const dari = this.dariTanggal();
    const sampai = this.sampaiTanggal();

    return this.sortedEntries().filter(e => {
      // Dicari juga lewat kata yang dibaca pengguna, bukan hanya slug teknisnya.
      const matchesSearch =
        !query ||
        labelAksi(e.aksi).toLowerCase().includes(query) ||
        labelEntitas(e.entitas).toLowerCase().includes(query) ||
        e.pelakuNama.toLowerCase().includes(query) ||
        e.aksi.toLowerCase().includes(query) ||
        e.entitasId.toLowerCase().includes(query);
      const matchesEntitas = entitas === 'All' || e.entitas === entitas;
      const matchesPelaku = pelaku === 'All' || e.pelakuNama === pelaku;
      const tanggal = e.waktu.slice(0, 10);
      const matchesDari = !dari || tanggal >= dari;
      const matchesSampai = !sampai || tanggal <= sampai;
      return matchesSearch && matchesEntitas && matchesPelaku && matchesDari && matchesSampai;
    });
  });

  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onEntitasChange(event: Event) {
    this.selectedEntitas.set((event.target as HTMLSelectElement).value);
  }

  onPelakuChange(event: Event) {
    this.selectedPelaku.set((event.target as HTMLSelectElement).value);
  }

  onDariChange(event: Event) {
    this.dariTanggal.set((event.target as HTMLInputElement).value);
  }

  onSampaiChange(event: Event) {
    this.sampaiTanggal.set((event.target as HTMLInputElement).value);
  }

}
