import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  standalone: true
})
export class LandingComponent implements OnInit {
  isDarkTheme = signal<boolean>(false);

  ngOnInit() {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', 'light');
    this.isDarkTheme.set(false);
  }

  toggleTheme() {
    // No-op to avoid compiler errors, theme toggle button has been removed from UI
  }
}
