import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-tolak-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tolak-modal.html',
  standalone: true
})
export class TolakModalComponent {
  private fb = inject(FormBuilder);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);

  @Input({ required: true }) loan!: Loan;
  @Output() closed = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<Loan>();

  public form: FormGroup = this.fb.group({
    catatanPenolakan: ['', Validators.required]
  });

  public isSaving = signal(false);
  public saveError = signal<string | null>(null);

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onCancel(): void {
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    const catatanPenolakan: string = this.form.value.catatanPenolakan;

    try {
      const updated = await this.loanRepository.tolak(this.loan.id, catatanPenolakan);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'tolak-peminjaman',
        entitas: 'Loan',
        entitasId: this.loan.id,
        nilaiLama: this.loan.status,
        nilaiBaru: `Ditolak: ${catatanPenolakan}`
      });
      this.rejected.emit(updated);
    } catch (error) {
      console.error('Gagal menolak peminjaman:', error);
      this.saveError.set('Gagal menolak peminjaman. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
