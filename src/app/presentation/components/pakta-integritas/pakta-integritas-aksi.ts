import { Injectable, inject, signal } from '@angular/core';
import { PaktaIntegritasRepository } from '../../../core/repositories/pakta-integritas.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuthService } from '../../../core/auth/auth.service';

export const MAX_UKURAN_PAKTA = 5 * 1024 * 1024; // 5MB — sama dengan batas di server
export const ACCEPT_PAKTA = '.pdf,application/pdf';

/**
 * Unggah/lihat/hapus pakta integritas beserta jejak auditnya — dipakai di
 * daftar Data Kendaraan, form tambah/ubah aset, dan halaman detail aset
 * supaya validasi & pencatatan audit tidak berbeda antar-halaman.
 */
@Injectable({ providedIn: 'root' })
export class PaktaIntegritasAksi {
  private paktaRepository = inject(PaktaIntegritasRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);

  /** NIBAR yang pakta integritasnya sedang diunggah/dibuka/dihapus — tombolnya dinonaktifkan sementara. */
  public readonly sedangDiproses = signal<string | null>(null);

  /** Pesan galat bila berkas tidak memenuhi syarat, null bila boleh diunggah. */
  validasi(berkas: File): string | null {
    const pdf = berkas.type === 'application/pdf' || (!berkas.type && berkas.name.toLowerCase().endsWith('.pdf'));
    if (!pdf) return 'Berkas pakta integritas harus berformat PDF.';
    if (berkas.size === 0) return 'Berkas pakta integritas kosong.';
    if (berkas.size > MAX_UKURAN_PAKTA) return 'Ukuran berkas pakta integritas melebihi 5 MB.';
    return null;
  }

  /** Melempar galat bila gagal — pemanggil yang memutuskan cara menampilkannya. */
  async unggah(nibar: string, pemegang: string, berkas: File): Promise<void> {
    const galat = this.validasi(berkas);
    if (galat) throw new Error(galat);

    const lama = this.paktaRepository.findByNibar(nibar);
    this.sedangDiproses.set(nibar);
    try {
      await this.paktaRepository.upsert(nibar, berkas, this.actorLabel());
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'unggah-pakta-integritas',
        entitas: 'PaktaIntegritas',
        entitasId: nibar,
        nilaiLama: lama ? lama.fileName : null,
        nilaiBaru: `${berkas.name} (pemegang: ${pemegang})`
      });
    } finally {
      this.sedangDiproses.set(null);
    }
  }

  /** Versi untuk tombol unggah langsung (input file) — galat ditampilkan lewat alert. */
  async unggahDariInput(nibar: string, pemegang: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const berkas = input.files?.[0];
    // Dikosongkan supaya memilih berkas yang sama lagi tetap memicu (change).
    input.value = '';
    if (!berkas) return;

    const galat = this.validasi(berkas);
    if (galat) {
      alert(galat);
      return;
    }
    try {
      await this.unggah(nibar, pemegang, berkas);
    } catch (error) {
      console.error('Gagal mengunggah pakta integritas:', error);
      alert('Gagal mengunggah pakta integritas. Periksa koneksi Anda dan coba lagi.');
    }
  }

  async lihat(nibar: string): Promise<void> {
    // Tab dibuka lebih dulu (masih dalam klik pengguna) supaya tidak diblokir
    // pemblokir pop-up; isinya diisi setelah berkas selesai diambil.
    const tab = window.open('', '_blank');
    this.sedangDiproses.set(nibar);
    try {
      const url = URL.createObjectURL(await this.paktaRepository.ambilBerkas(nibar));
      if (tab) {
        tab.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = this.paktaRepository.findByNibar(nibar)?.fileName ?? `pakta-integritas-${nibar}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      tab?.close();
      console.error('Gagal membuka pakta integritas:', error);
      alert('Gagal membuka pakta integritas. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.sedangDiproses.set(null);
    }
  }

  async hapus(nibar: string): Promise<void> {
    const pakta = this.paktaRepository.findByNibar(nibar);
    if (!pakta) return;
    if (!confirm(`Hapus pakta integritas atas nama ${pakta.pemegang}?`)) return;

    this.sedangDiproses.set(nibar);
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
      this.sedangDiproses.set(null);
    }
  }

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }
}
