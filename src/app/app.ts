import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { CarRepository } from './core/repositories/car.repository';
import { LocalCarRepository } from './data/repositories/local-car.repository';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  standalone: true
})
export class App implements OnInit {
  private carRepository = inject(CarRepository);
  private router = inject(Router);

  public sidebarCollapsed = false;
  public isDarkTheme = signal<boolean>(false);
  public showReportModal = signal<boolean>(false);
  public showSettingsModal = signal<boolean>(false);
  
  public currentUrl = signal<string>('/dashboard');
  public authSignal = signal<boolean>(false);
  public isAuthenticated = computed(() => this.authSignal());

  public currentDate = signal<string>('');

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

    // Auth initialization
    const hasAuth = localStorage.getItem('pusaka_bangli_auth') === 'true';
    this.authSignal.set(hasAuth);

    // Track routing transitions for route guard and active link highlighting
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const url = this.router.url;
      this.currentUrl.set(url);

      const authed = localStorage.getItem('pusaka_bangli_auth') === 'true';
      this.authSignal.set(authed);

      const isPublicPage = url === '/' || url.startsWith('/login');
      if (!authed && !isPublicPage) {
        this.router.navigate(['/login']);
      }
    });

    // Current Date formatting
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    this.currentDate.set(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
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
    localStorage.removeItem('pusaka_bangli_auth');
    this.authSignal.set(false);
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

  resetDatabase() {
    const confirmReset = confirm('Apakah Anda yakin ingin menyetel ulang database ke kondisi bawaan awal? Seluruh data mobil buatan Anda akan terhapus.');
    if (confirmReset) {
      if (this.carRepository instanceof LocalCarRepository) {
        this.carRepository.resetDatabase();
      }
      alert('Database Pusaka Bangli telah berhasil disetel ulang.');
      this.closeSettings();
      window.location.reload();
    }
  }

  // Smooth scroll helper for Schedule Card
  scrollToSchedule(event: Event) {
    event.preventDefault();
    this.router.navigate(['/dashboard'], { queryParams: { section: 'schedule' } });
    
    setTimeout(() => {
      const schedulePanel = document.querySelector('.bottom-section');
      if (schedulePanel) {
        schedulePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
}
