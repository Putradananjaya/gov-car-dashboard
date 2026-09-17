import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { Peran } from '../../../core/models/user.model';

interface SeksiPanduan {
  id: string;
  judul: string;
  peranTerkait: Peran[];
  kataKunci: string;
}

const DAFTAR_SEKSI: SeksiPanduan[] = [
  { id: 'dashboard', judul: 'Dashboard', peranTerkait: ['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'], kataKunci: 'dashboard beranda ringkasan statistik grafik' },
  { id: 'jadwal', judul: 'Jadwal', peranTerkait: ['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'], kataKunci: 'jadwal kalender bentrok booking pemesanan tanggal' },
  { id: 'aset', judul: 'Data Kendaraan', peranTerkait: ['superadmin', 'admin'], kataKunci: 'data kendaraan aset bmd nibar pelat nomor' },
  { id: 'pemeliharaan', judul: 'Pemeliharaan', peranTerkait: ['superadmin', 'admin'], kataKunci: 'pemeliharaan servis rusak kondisi bengkel' },
  { id: 'pajak', judul: 'Pajak & STNK', peranTerkait: ['superadmin', 'admin'], kataKunci: 'pajak stnk kadaluarsa perpanjangan' },
  { id: 'tracking', judul: 'Monitoring GPS', peranTerkait: ['superadmin', 'admin'], kataKunci: 'gps tracking lokasi peta pelacakan' },
  { id: 'peminjaman', judul: 'Peminjaman', peranTerkait: ['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'], kataKunci: 'peminjaman ajukan pinjam kendaraan formulir rute surat tugas' },
  { id: 'persetujuan', judul: 'Persetujuan Peminjaman', peranTerkait: ['superadmin', 'admin', 'pejabat_penatausahaan'], kataKunci: 'persetujuan setujui tolak serah terima bast kunci odometer bbm kondisi' },
  { id: 'laporan', judul: 'Laporan', peranTerkait: ['superadmin', 'admin', 'pimpinan'], kataKunci: 'laporan cetak pdf rekap' },
  { id: 'audit', judul: 'Jejak Audit', peranTerkait: ['superadmin'], kataKunci: 'audit jejak log riwayat aktivitas' },
  { id: 'pengguna', judul: 'Manajemen Pengguna', peranTerkait: ['superadmin'], kataKunci: 'pengguna user akun peran role kata sandi password' },
  { id: 'pengaturan', judul: 'Pengaturan', peranTerkait: ['superadmin'], kataKunci: 'pengaturan setelan reset database simulasi gps' }
];

@Component({
  selector: 'app-panduan',
  imports: [CommonModule],
  templateUrl: './panduan.html',
  standalone: true
})
export class PanduanComponent {
  private authService = inject(AuthService);
  public peran = this.authService.peran;

  public pencarian = signal('');
  private terbuka = signal<Set<string>>(new Set(this.seksiRelevanUntukSaya()));

  private seksiRelevanUntukSaya(): string[] {
    const peran = this.authService.peran();
    if (!peran) return [];
    return DAFTAR_SEKSI.filter(s => s.peranTerkait.includes(peran)).map(s => s.id);
  }

  public relevan = computed(() => new Set(this.seksiRelevanUntukSaya()));

  isRelevan(id: string): boolean {
    return this.relevan().has(id);
  }

  isTerbuka(id: string): boolean {
    return this.terbuka().has(id);
  }

  toggle(id: string): void {
    this.terbuka.update(set => {
      const baru = new Set(set);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  cocokPencarian(id: string): boolean {
    const q = this.pencarian().trim().toLowerCase();
    if (!q) return true;
    const seksi = DAFTAR_SEKSI.find(s => s.id === id);
    if (!seksi) return true;
    return seksi.judul.toLowerCase().includes(q) || seksi.kataKunci.includes(q);
  }

  adaYangCocok(ids: string[]): boolean {
    return ids.some(id => this.cocokPencarian(id));
  }

  bukaSemua(): void {
    this.terbuka.set(new Set(DAFTAR_SEKSI.map(s => s.id)));
  }

  tutupSemua(): void {
    this.terbuka.set(new Set());
  }
}
