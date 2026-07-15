import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CarRepository } from '../../../core/repositories/car.repository';

@Component({
  selector: 'app-car-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './car-form.html',
  standalone: true
})
export class CarFormComponent implements OnInit {
  private carRepository = inject(CarRepository);
  private fb = inject(FormBuilder);

  @Input() carId: string | null = null;
  @Output() closeForm = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  carForm!: FormGroup;
  isEditMode = false;

  // Data Referensi Form
  agencies = [
    'Sekretariat Daerah',
    'Dinas Pekerjaan Umum & Penataan Ruang',
    'Dinas Kesehatan',
    'Dinas Pendidikan, Pemuda & Olahraga',
    'Dinas Perhubungan',
    'Satuan Polisi Pamong Praja',
    'Dinas Sosial',
    'Badan Pengelolaan Keuangan, Pendapatan & Aset Daerah',
    'Kecamatan Bangli',
    'INSPEKTORAT DAERAH'
  ];

  brands = ['Toyota', 'Mitsubishi', 'Honda', 'Hyundai', 'Nissan', 'Wuling', 'Suzuki', 'Yamaha', 'Honda Motor'];
  
  types = ['Sedan', 'SUV', 'MPV', 'Elektrik', 'Sepeda Motor'];

  statuses = ['Aktif', 'Digunakan', 'Service', 'Rusak'];

  ngOnInit() {
    this.isEditMode = !!this.carId;
    this.initForm();

    if (this.isEditMode && this.carId) {
      const existingCar = this.carRepository.cars().find(c => c.id === this.carId);
      if (existingCar) {
        this.carForm.patchValue(existingCar);
      }
    }
  }

  private initForm() {
    const currentYear = new Date().getFullYear();

    this.carForm = this.fb.group({
      plateNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$|^RI\s\d{1,2}$/)]],
      model: ['', [Validators.required, Validators.minLength(2)]],
      brand: ['', Validators.required],
      type: ['', Validators.required],
      agency: ['', Validators.required],
      driverName: ['', Validators.required],
      driverPhone: ['', [Validators.required, Validators.pattern(/^08[1-9][0-9]{7,10}$/)]],
      status: ['Aktif', Validators.required],
      acquisitionYear: [currentYear, [Validators.required, Validators.min(2000), Validators.max(currentYear)]],
      lastServiceDate: ['', Validators.required],
      nextServiceDate: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.carForm.invalid) {
      this.carForm.markAllAsTouched();
      return;
    }

    const formData = this.carForm.value;

    if (this.isEditMode && this.carId) {
      this.carRepository.updateCar(this.carId, formData);
    } else {
      this.carRepository.addCar(formData);
    }

    this.saved.emit();
  }

  onCancel() {
    this.closeForm.emit();
  }

  // Helpers for validation styling
  isInvalid(controlName: string): boolean {
    const control = this.carForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.carForm.get(controlName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Kolom ini wajib diisi';
    if (control.errors['pattern']) {
      if (controlName === 'plateNumber') return 'Format pelat nomor salah (contoh: B 1234 ABC)';
      if (controlName === 'driverPhone') return 'Format nomor HP salah (contoh: 081234567890)';
    }
    if (control.errors['min'] || control.errors['max']) {
      return 'Tahun perolehan tidak valid';
    }
    if (control.errors['minlength']) {
      return 'Minimal terdiri dari 2 karakter';
    }
    return 'Input tidak valid';
  }
}
