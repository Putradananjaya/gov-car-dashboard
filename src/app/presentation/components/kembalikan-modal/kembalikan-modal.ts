import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { KondisiAset, Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-kembalikan-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kembalikan-modal.html',
  standalone: true
})
export class KembalikanModalComponent {
  private fb = inject(FormBuilder);
  private loanRepository = inject(LoanRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);

  @Input({ required: true }) loan!: Loan;
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<Loan>();

  public kondisiOptions: KondisiAset[] = ['Baik', 'Rusak Ringan', 'Rusak Berat'];

  public form: FormGroup = this.fb.group({
    odometerMasuk: [null, [Validators.required, Validators.min(0)]],
    bbmMasuk: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    kondisiMasuk: ['Baik' as KondisiAset, Validators.required],
    catatanKondisiMasuk: [''],
    kunciDikembalikan: [false, Validators.requiredTrue]
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
    const values = this.form.value;

    try {
      const updated = await this.loanRepository.kembalikan(this.loan.id, {
        odometerMasuk: Number(values.odometerMasuk),
        bbmMasuk: Number(values.bbmMasuk),
        kondisiMasuk: values.kondisiMasuk,
        catatanKondisiMasuk: values.catatanKondisiMasuk?.trim() || null,
        kunciDikembalikan: values.kunciDikembalikan
      });
      await this.operationalRepository.refresh();
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'kembalikan-peminjaman',
        entitas: 'Loan',
        entitasId: this.loan.id,
        nilaiLama: this.loan.status,
        nilaiBaru: 'Selesai'
      });
      this.completed.emit(updated);
    } catch (error) {
      console.error('Gagal memproses pengembalian:', error);
      this.saveError.set('Gagal memproses pengembalian. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
