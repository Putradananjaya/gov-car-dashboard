import { Component, OnInit, OnDestroy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

const HERO_SLIDE_INTERVAL_MS = 5000;

/**
 * Tujuan dan label tombol masuk di halaman publik, mengikuti sesi yang sedang
 * aktif. Halaman ini tetap bisa dibuka tanpa logout lebih dulu, jadi tautan
 * yang mati ke formulir login membuat pengguna yang sudah masuk diminta login
 * lagi — persis kebingungan yang sama seperti halaman publik yang dulu
 * terbungkus kerangka dashboard.
 */
export function tentukanAksiMasuk(sudahMasuk: boolean): { tujuan: string; label: string } {
  return sudahMasuk
    ? { tujuan: '/app/beranda', label: 'Buka Dashboard' }
    : { tujuan: '/masuk', label: 'Masuk Admin' };
}

interface PublicStats {
  totalKendaraan: number;
  armadaSiapPakai: number;
  jumlahOpd: number;
  asetPajakKadaluarsa: number;
}

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  standalone: true
})
export class LandingComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  public readonly aksiMasuk = computed(() => tentukanAksiMasuk(this.authService.isLoggedIn()));

  isDarkTheme = signal<boolean>(false);
  stats = signal<PublicStats | null>(null);

  // Ganti/tambah nama file di sini sesuai gambar yang ditaruh di public/assets/hero/
  heroImages: string[] = [
    'assets/hero/hero-1.jpg',
    'assets/hero/hero-2.jpg',
    'assets/hero/hero-3.jpg',
  ];

  activeHeroIndex = signal<number>(0);

  private heroIntervalId?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', 'light');
    this.isDarkTheme.set(false);

    this.startHeroSlideshow();
    this.loadStats();
  }

  private async loadStats(): Promise<void> {
    try {
      const stats = await firstValueFrom(this.http.get<PublicStats>(`${API_BASE_URL}/public-stats`));
      this.stats.set(stats);
    } catch {
      // Portal publik tetap harus tampil walau statistik gagal dimuat (mis. backend belum siap).
    }
  }

  ngOnDestroy() {
    if (this.heroIntervalId) {
      clearInterval(this.heroIntervalId);
    }
  }

  private startHeroSlideshow() {
    if (this.heroImages.length <= 1) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    this.heroIntervalId = setInterval(() => {
      this.activeHeroIndex.update(i => (i + 1) % this.heroImages.length);
    }, HERO_SLIDE_INTERVAL_MS);
  }

  toggleTheme() {
    // No-op to avoid compiler errors, theme toggle button has been removed from UI
  }
}
