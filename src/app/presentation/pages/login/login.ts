import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  standalone: true
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loginForm!: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  isDarkTheme = signal<boolean>(false);

  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    document.body.classList.remove('dark-theme');
    localStorage.setItem('pusaka_bangli_theme', 'light');
    this.isDarkTheme.set(false);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const { username, password } = this.loginForm.value;

    // Simulasikan delay autentikasi untuk UX premium
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('pusaka_bangli_auth', 'true');
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      } else {
        this.isLoading.set(false);
        this.errorMessage.set('Username atau password salah!');
      }
    }, 750);
  }

  toggleTheme() {
    // No-op to avoid compiler errors, theme toggle button has been removed from UI
  }
}
