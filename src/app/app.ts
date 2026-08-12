import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { CarRepository } from './core/repositories/car.repository';
import { CarCompatRepository } from './data/repositories/indexed-db/car-compat.repository';
import { TelemetrySimulatorService } from './data/simulation/telemetry-simulator.service';
import { AuthService } from './core/auth/auth.service';
import { PermissionService } from './core/auth/permission.service';
import { HasPermissionDirective } from './presentation/components/has-permission/has-permission.directive';

const GPS_SIMULATION_STORAGE_KEY = 'pusaka_bangli_simulasi_gps';

const LABEL_PERAN: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin OPD',
  pegawai: 'Pegawai'
};

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HasPermissionDirective],
  templateUrl: './app.html',
  standalone: true
})
export class App implements OnInit {
  private carRepository = inject(CarRepository);
  private router = inject(Router);
  private authService = inject(AuthService);
  private telemetrySimulator = inject(TelemetrySimulatorService);
  public permissionService = inject(PermissionService);

  public sidebarCollapsed = false;
  public isDarkTheme = signal<boolean>(false);
  public showReportModal = signal<boolean>(false);
  public showSettingsModal = signal<boolean>(false);

  public currentUrl = signal<string>('/app/beranda');
  public isAuthenticated = computed(() => this.authService.isLoggedIn());
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
    return peran ? LABEL_PERAN[peran] : '';
  });

  public currentDate = signal<string>('');
  public gpsSimulationEnabled = signal<boolean>(false);

  cars = computed(() => this.carRepository.cars());
  
  totalCount = computed(() => this.cars().length);
  availableCount = computed(() => this.cars().filter(c => c.status === 'Aktif').length);
  borrowedCount = computed(() => this.cars().filter(c => c.status === 'Digunakan').length);
  maintenanceCount = computed(() => this.cars().filter(c => c.status === 'Service').length);
  brokenCount = computed(() => this.cars().filter(c => c.status === 'Rusak').length);

  ngOnInit() {
    // Force Light theme unconditionally as requested
    document.body.classList.remove('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', 'light');
    this.isDarkTheme.set(false);

    // Track routing transitions for active link highlighting.
    // Auth/route protection itself is handled by authGuard/roleGuard on app.routes.ts.
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });

    // Current Date formatting
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    this.currentDate.set(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);

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

  logout() {
    this.authService.logout();
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

  // Smooth scroll helper for Schedule Card
  scrollToSchedule(event: Event) {
    event.preventDefault();
    this.router.navigate(['/app/beranda'], { queryParams: { section: 'schedule' } });
    
    setTimeout(() => {
      const schedulePanel = document.querySelector('.bottom-section');
      if (schedulePanel) {
        schedulePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
}
