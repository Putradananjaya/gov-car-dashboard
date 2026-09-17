import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { VehicleOperationalRepository } from '../../../core/repositories/vehicle-operational.repository';
import { AuditRepository } from '../../../core/repositories/audit.repository';
import { AuthService } from '../../../core/auth/auth.service';
import { KondisiAset, Loan } from '../../../core/models/loan.model';

@Component({
  selector: 'app-serah-terima-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './serah-terima-modal.html',
  standalone: true
})
export class SerahTerimaModalComponent {
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
    odometerKeluar: [null, [Validators.required, Validators.min(0)]],
    bbmKeluar: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    kondisiKeluar: ['Baik' as KondisiAset, Validators.required],
    catatanKondisiKeluar: [''],
    kunciDiserahkan: [false, Validators.requiredTrue]
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
      const updated = await this.loanRepository.serahTerima(this.loan.id, {
        odometerKeluar: Number(values.odometerKeluar),
        bbmKeluar: Number(values.bbmKeluar),
        kondisiKeluar: values.kondisiKeluar,
        catatanKondisiKeluar: values.catatanKondisiKeluar?.trim() || null,
        kunciDiserahkan: values.kunciDiserahkan
      });
      await this.operationalRepository.refresh();
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'serah-terima-peminjaman',
        entitas: 'Loan',
        entitasId: this.loan.id,
        nilaiLama: 'Disetujui',
        nilaiBaru: 'Berjalan'
      });
      this.completed.emit(updated);
    } catch (error) {
      console.error('Gagal melakukan serah terima:', error);
      this.saveError.set('Gagal melakukan serah terima. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
