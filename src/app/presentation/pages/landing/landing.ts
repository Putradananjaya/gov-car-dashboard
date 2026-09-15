import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

const HERO_SLIDE_INTERVAL_MS = 5000;

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  standalone: true
})
export class LandingComponent implements OnInit, OnDestroy {
  isDarkTheme = signal<boolean>(false);

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
