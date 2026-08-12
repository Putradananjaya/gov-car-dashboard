import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditRepository } from '../../../../core/repositories/audit.repository';

@Component({
  selector: 'app-audit-list',
  imports: [CommonModule],
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

  public filteredEntries = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const entitas = this.selectedEntitas();
    const pelaku = this.selectedPelaku();
    const dari = this.dariTanggal();
    const sampai = this.sampaiTanggal();

    return this.sortedEntries().filter(e => {
      const matchesSearch = !query || e.aksi.toLowerCase().includes(query) || e.entitasId.toLowerCase().includes(query);
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

  formatNilai(value: unknown): string {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
