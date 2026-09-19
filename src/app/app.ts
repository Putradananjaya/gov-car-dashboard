import { Component, LOCALE_ID, OnDestroy, OnInit, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { CarRepository } from './core/repositories/car.repository';
import { CarCompatRepository } from './data/repositories/indexed-db/car-compat.repository';
import { TelemetrySimulatorService } from './data/simulation/telemetry-simulator.service';
import { AuthService } from './core/auth/auth.service';
import { PermissionService } from './core/auth/permission.service';
import { HasPermissionDirective } from './presentation/components/has-permission/has-permission.directive';
import { formatTanggalId } from './shared/pipes/tanggal-id.pipe';
import { LABEL_PERAN_SINGKAT } from './core/auth/kemampuan';

const GPS_SIMULATION_STORAGE_KEY = 'pusaka_bangli_simulasi_gps';

/** Awalan rute yang memakai kerangka dashboard (sidebar + header). */
const AWALAN_RUTE_APLIKASI = '/app';

/**
 * Alamat yang sedang dibuka, dibaca langsung dari browser. Dipakai sebagai
 * nilai awal currentUrl supaya kerangka dashboard tidak sempat berkedip
 * sebelum NavigationEnd pertama tiba.
 */
function alamatSekarang(): string {
  if (typeof location === 'undefined') return AWALAN_RUTE_APLIKASI;
  return `${location.pathname}${location.search}`;
}

/**
 * Kerangka dashboard (sidebar + header) hanya untuk rute di bawah /app.
 *
 * Status login saja tidak cukup: halaman publik ("/" dan "/masuk") tetap bisa
 * dibuka selagi sesi masih hidup — mis. menempel tautan beranda di tab baru —
 * dan dulu halaman itu ikut terbungkus sidebar dashboard.
 */
export function pakaiKerangkaAplikasi(sudahMasuk: boolean, alamat: string): boolean {
  return sudahMasuk && alamat.startsWith(AWALAN_RUTE_APLIKASI);
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HasPermissionDirective],
  templateUrl: './app.html',
  standalone: true
})
export class App implements OnInit, OnDestroy {
  private carRepository = inject(CarRepository);
  private router = inject(Router);
  private authService = inject(AuthService);
  private telemetrySimulator = inject(TelemetrySimulatorService);
  public permissionService = inject(PermissionService);
  private readonly locale = inject(LOCALE_ID);

  public sidebarCollapsed = false;
  public isDarkTheme = signal<boolean>(false);
  public showReportModal = signal<boolean>(false);
  public showSettingsModal = signal<boolean>(false);

  public currentUrl = signal<string>(alamatSekarang());
  public isAuthenticated = computed(() => this.authService.isLoggedIn());

  public showAppShell = computed(() =>
    pakaiKerangkaAplikasi(this.isAuthenticated(), this.currentUrl())
  );
  public currentUser = this.authService.currentUser;
  public currentUserLabel = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    const initials = user.nama
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
    return initials;
  });
  public currentPeranLabel = computed(() => {
    const peran = this.authService.peran();
    return peran ? LABEL_PERAN_SINGKAT[peran] : '';
  });

  public currentDate = signal<string>('');
  public gpsSimulationEnabled = signal<boolean>(false);
  private jamTimer: ReturnType<typeof setInterval> | null = null;

  cars = computed(() => this.carRepository.cars());
  
  totalCount = computed(() => this.cars().length);
  availableCount = computed(() => this.cars().filter(c => c.status === 'Aktif').length);
  borrowedCount = computed(() => this.cars().filter(c => c.status === 'Digunakan').length);
  maintenanceCount = computed(() => this.cars().filter(c => c.status === 'Service').length);
  brokenCount = computed(() => this.cars().filter(c => c.status === 'Rusak').length);

  private perbaruiTanggal(): void {
    this.currentDate.set(formatTanggalId(new Date(), this.locale, 'lengkap'));
  }

  ngOnDestroy(): void {
    if (this.jamTimer !== null) {
      clearInterval(this.jamTimer);
      this.jamTimer = null;
    }
  }

  ngOnInit() {
    // Force Light theme unconditionally as requested
    document.body.classList.remove('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', 'light');
    this.isDarkTheme.set(false);

    // Track routing transitions for active link highlighting.
    // Auth/route protection itself is handled by authGuard/izinGuard on app.routes.ts.
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });

    // Tanggal header memakai format baku aplikasi (lihat TanggalIdPipe).
    // Karena formatnya menyertakan jam, nilainya disegarkan berkala supaya
    // tidak berhenti di menit halaman pertama kali dimuat.
    this.perbaruiTanggal();
    this.jamTimer = setInterval(() => this.perbaruiTanggal(), 30_000);

    // Simulasi GPS mati secara default (K4); nyalakan hanya bila pengguna
    // sebelumnya sudah mengaktifkannya lewat toggle di Pengaturan.
    const simulationWasEnabled = localStorage.getItem(GPS_SIMULATION_STORAGE_KEY) === 'true';
    this.gpsSimulationEnabled.set(simulationWasEnabled);
    if (simulationWasEnabled) {
      this.telemetrySimulator.start();
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', isDark ? 'dark' : 'light');
    this.isDarkTheme.set(isDark);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  openReport() {
    this.showReportModal.set(true);
  }

  closeReport() {
    this.showReportModal.set(false);
  }

  printReport() {
    window.print();
  }

  openSettings() {
    this.showSettingsModal.set(true);
  }

  closeSettings() {
    this.showSettingsModal.set(false);
  }

  toggleGpsSimulation() {
    const next = !this.gpsSimulationEnabled();
    this.gpsSimulationEnabled.set(next);
    localStorage.setItem(GPS_SIMULATION_STORAGE_KEY, String(next));

    if (next) {
      this.telemetrySimulator.start();
    } else {
      this.telemetrySimulator.stop();
    }
  }

  async resetDatabase() {
    if (!this.permissionService.can('sistem.resetBasisData')) {
      return;
    }

    const confirmReset = confirm('Apakah Anda yakin ingin menyetel ulang database ke kondisi bawaan awal? Seluruh data mobil buatan Anda akan terhapus.');
    if (confirmReset) {
      if (this.carRepository instanceof CarCompatRepository) {
        await this.carRepository.resetDatabase();
      }
      alert('Database Pusaka Bangli telah berhasil disetel ulang.');
      this.closeSettings();
      window.location.reload();
    }
  }

}
