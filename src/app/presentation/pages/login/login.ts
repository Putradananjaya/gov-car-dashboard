import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  standalone: true
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  loginForm!: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  isDarkTheme = signal<boolean>(false);

  ngOnInit() {
    this.loginForm = this.fb.group({
      nip: ['', Validators.required],
      password: ['', Validators.required]
    });

    document.body.classList.remove('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', 'light');
    this.isDarkTheme.set(false);
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const { nip, password } = this.loginForm.value;
    const result = await this.authService.login(nip, password);
    this.isLoading.set(false);

    if (result.ok) {
      const peran = this.authService.peran();
      const tujuan = peran === 'pegawai' ? '/app/peminjaman' : '/app/beranda';
      this.router.navigate([tujuan]);
      return;
    }

    if (result.reason === 'locked') {
      const menit = Math.ceil(result.retryAfterMs / 60000);
      this.errorMessage.set(`Akun terkunci sementara akibat terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.`);
      return;
    }

    if (result.reason === 'error') {
      this.errorMessage.set('Tidak dapat terhubung ke server. Coba lagi.');
      return;
    }

    this.errorMessage.set('NIP atau kata sandi tidak sesuai');
  }

  toggleTheme() {
    // No-op to avoid compiler errors, theme toggle button has been removed from UI
  }
}
