import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { VehicleAssetRepository } from '../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../core/repositories/loan.repository';
import { UserRepository } from '../../core/repositories/user.repository';
import { ServiceRepository } from '../../core/repositories/service.repository';
import { AuditRepository } from '../../core/repositories/audit.repository';

/** Jeda antar-putaran muat ulang data inti. */
const JEDA_SINKRON_MS = 20_000;

/**
 * Data yang jarang berubah (pengguna, riwayat servis) dan jejak audit yang
 * payload-nya tumbuh terus tidak ikut setiap putaran — cukup berkala.
 */
const JEDA_SINKRON_PENUH_MS = 120_000;

/** Peredam supaya rentetan fokus/navigasi tidak memberondong server. */
const JEDA_MINIMUM_MS = 3_000;

/**
 * Menjaga data yang sedang tampil tetap mengikuti isi server tanpa pengguna
 * perlu memuat ulang halaman.
 *
 * Aksi milik pengguna sendiri sudah langsung terlihat: setiap repository HTTP
 * memanggil reload() setelah tulis, dan seluruh tampilan membaca signal-nya.
 * Yang belum tertangani adalah perubahan dari pengguna/perangkat LAIN —
 * mis. pegawai mengajukan peminjaman sementara halaman Persetujuan milik admin
 * sudah terbuka. Layanan ini menutup celah itu dengan menarik ulang data
 * secara berkala, ditambah pemicu saat tab kembali aktif, koneksi pulih, dan
 * setiap pindah halaman — jadi terasa langsung untuk pemakaian normal.
 *
 * Foto kendaraan dan dokumen peminjaman sengaja TIDAK ikut: endpoint-nya
 * mengirim seluruh berkas sebagai base64, terlalu berat untuk ditarik berkala,
 * dan keduanya sudah dimuat ulang setiap kali diubah dari aplikasi ini.
 */
@Injectable({ providedIn: 'root' })
export class DataSyncService {
  private authService = inject(AuthService);
  private router = inject(Router);

  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private userRepository = inject(UserRepository);
  private serviceRepository = inject(ServiceRepository);
  private auditRepository = inject(AuditRepository);

  private timer: ReturnType<typeof setInterval> | null = null;
  private pembersih: (() => void)[] = [];
  private sedangSinkron = false;
  private terakhirMulai = 0;
  private terakhirPenuh = 0;

  /** Waktu sinkronisasi berhasil terakhir — siap dipakai sebagai indikator "diperbarui pukul ..." di UI. */
  public readonly terakhirSinkron = signal<Date | null>(null);

  public mulai(): void {
    if (this.timer !== null) return;

    this.timer = setInterval(() => void this.sinkron(), JEDA_SINKRON_MS);

    // Tab yang tidak terlihat tidak ditarik datanya; begitu kembali aktif
    // (atau koneksi pulih) langsung disamakan supaya tidak menampilkan data
    // basi sedetik pun setelah pengguna kembali.
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      const saatKembaliAktif = () => {
        if (document.visibilityState === 'visible') this.picu();
      };
      document.addEventListener('visibilitychange', saatKembaliAktif);
      window.addEventListener('focus', saatKembaliAktif);
      window.addEventListener('online', saatKembaliAktif);
      this.pembersih.push(() => {
        document.removeEventListener('visibilitychange', saatKembaliAktif);
        window.removeEventListener('focus', saatKembaliAktif);
        window.removeEventListener('online', saatKembaliAktif);
      });
    }

    const langganan = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.picu());
    this.pembersih.push(() => langganan.unsubscribe());
  }

  public berhenti(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const bersihkan of this.pembersih) bersihkan();
    this.pembersih = [];
  }

  /**
   * Minta sinkronisasi dari pemicu yang bisa datang beruntun (fokus, navigasi,
   * koneksi pulih). Permintaan yang terlalu rapat diabaikan.
   */
  public picu(): void {
    if (Date.now() - this.terakhirMulai < JEDA_MINIMUM_MS) return;
    void this.sinkron();
  }

  /**
   * Tarik ulang data dari server. `paksaPenuh` menyertakan koleksi yang
   * biasanya hanya ikut tiap dua menit.
   */
  public async sinkron(paksaPenuh = false): Promise<void> {
    if (!this.authService.isLoggedIn()) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (this.sedangSinkron) return;

    const sekarang = Date.now();
    const penuh = paksaPenuh || sekarang - this.terakhirPenuh >= JEDA_SINKRON_PENUH_MS;
    this.sedangSinkron = true;
    this.terakhirMulai = sekarang;

    try {
      const tugas: Promise<void>[] = [
        this.assetRepository.refresh(),
        this.operationalRepository.refresh(),
        this.loanRepository.refresh()
      ];
      if (penuh) {
        tugas.push(
          this.userRepository.refresh(),
          this.serviceRepository.refresh(),
          // Endpoint audit khusus superadmin — peran lain akan ditolak dan
          // repository menelan galatnya, jadi allSettled sudah cukup.
          this.auditRepository.refresh()
        );
      }

      // Satu koleksi gagal (mis. jaringan putus sesaat) tidak boleh
      // membatalkan koleksi lain yang sudah berhasil dimuat.
      const hasil = await Promise.allSettled(tugas);

      // Saat semuanya gagal, jangan catat waktunya — biar putaran berikutnya
      // (termasuk koleksi berat) mencoba lagi alih-alih menunggu dua menit.
      if (!hasil.some(satu => satu.status === 'fulfilled')) return;

      if (penuh) this.terakhirPenuh = Date.now();
      this.terakhirSinkron.set(new Date());
    } finally {
      this.sedangSinkron = false;
    }
  }
}
