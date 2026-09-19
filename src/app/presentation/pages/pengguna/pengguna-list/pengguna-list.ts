import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserRepository } from '../../../../core/repositories/user.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { Peran, User } from '../../../../core/models/user.model';
import { KNOWN_OPD_LIST } from '../../../../shared/known-opd-list';
import { generateTemporaryPassword } from '../../../../shared/password-generator';
import { pesanGalat } from '../../../../shared/pesan-galat';
import { TanggalIdPipe } from '../../../../shared/pipes/tanggal-id.pipe';

@Component({
  selector: 'app-pengguna-list',
  imports: [CommonModule, ReactiveFormsModule, TanggalIdPipe],
  templateUrl: './pengguna-list.html',
  standalone: true
})
export class PenggunaListComponent {
  private fb = inject(FormBuilder);
  private userRepository = inject(UserRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);

  public users = computed(() => this.userRepository.users().slice().sort((a, b) => a.nama.localeCompare(b.nama)));

  public opdList = KNOWN_OPD_LIST;
  public peranOptions: Peran[] = ['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'];

  private static readonly LABEL_PERAN: Record<Peran, string> = {
    superadmin: 'Superadmin (Kabid Aset)',
    admin: 'Admin (Pengurus Barang)',
    pegawai: 'Pegawai (Pemohon)',
    pejabat_penatausahaan: 'Pejabat Penatausahaan Pengguna Barang',
    pimpinan: 'Pimpinan (Kepala Dinas/Badan)'
  };

  peranLabel(peran: Peran): string {
    return PenggunaListComponent.LABEL_PERAN[peran];
  }

  public showFormModal = signal(false);
  public editingId = signal<string | null>(null);
  public form!: FormGroup;
  public formError = signal<string | null>(null);

  public tempPasswordModal = signal<{ nama: string; password: string } | null>(null);

  private currentUserId = computed(() => this.authService.currentUser()?.id ?? '');

  private actorLabel(): string {
    return this.authService.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  /** Dokumen v2: superadmin terakhir tidak boleh dinonaktifkan / diturunkan perannya sendiri. */
  private isLastActiveSuperadmin(userId: string): boolean {
    const target = this.userRepository.findById(userId);
    if (!target || target.peran !== 'superadmin' || !target.aktif) return false;

    const otherActiveSuperadmins = this.users().filter(u => u.id !== userId && u.peran === 'superadmin' && u.aktif);
    return otherActiveSuperadmins.length === 0;
  }

  openAddModal(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form = this.fb.group({
      nip: ['', [Validators.required, Validators.pattern(/^\d{8,20}$/)]],
      nama: ['', Validators.required],
      jabatan: ['', Validators.required],
      unitKerja: ['', Validators.required],
      peran: ['pegawai' as Peran, Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
    this.showFormModal.set(true);
  }

  openEditModal(user: User): void {
    this.editingId.set(user.id);
    this.formError.set(null);
    this.form = this.fb.group({
      nip: [{ value: user.nip, disabled: true }],
      nama: [user.nama, Validators.required],
      jabatan: [user.jabatan, Validators.required],
      unitKerja: [user.unitKerja, Validators.required],
      peran: [user.peran, Validators.required]
    });
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.formError.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const editingId = this.editingId();
    const values = this.form.getRawValue();

    if (editingId && values.peran !== 'superadmin' && this.isLastActiveSuperadmin(editingId)) {
      this.formError.set('Tidak bisa mengubah peran superadmin terakhir yang masih aktif.');
      return;
    }

    const previous = editingId ? this.userRepository.findById(editingId) : undefined;

    try {
      await this.simpan(editingId, previous, values);
    } catch (error) {
      // Server menolak (mis. NIP ganda, atau peran yang belum dikenal backend
      // lama) — tanpa ini modal hanya diam dan pengguna mengira tersimpan.
      this.formError.set(pesanGalat(error, 'Gagal menyimpan. Coba lagi.'));
      return;
    }

    this.closeFormModal();
  }

  /**
   * Kolom form berbeda per-mode: `password` hanya ada — dan hanya dibaca —
   * saat membuat pengguna baru, sedangkan `nip` dikunci saat mengedit.
   */
  private async simpan(
    editingId: string | null,
    previous: User | undefined,
    values: { nip: string; nama: string; jabatan: string; unitKerja: string; peran: Peran; password: string }
  ): Promise<void> {
    if (editingId) {
      const user: User = { ...previous!, nama: values.nama, jabatan: values.jabatan, unitKerja: values.unitKerja, peran: values.peran };
      await this.userRepository.update(user);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'ubah',
        entitas: 'User',
        entitasId: user.id,
        nilaiLama: { nama: previous!.nama, jabatan: previous!.jabatan, unitKerja: previous!.unitKerja, peran: previous!.peran },
        nilaiBaru: { nama: user.nama, jabatan: user.jabatan, unitKerja: user.unitKerja, peran: user.peran }
      });
    } else {
      await this.userRepository.create({
        nip: values.nip,
        nama: values.nama,
        jabatan: values.jabatan,
        unitKerja: values.unitKerja,
        peran: values.peran,
        password: values.password
      });
      const created = this.userRepository.findByNip(values.nip);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'tambah',
        entitas: 'User',
        entitasId: created?.id ?? values.nip,
        nilaiBaru: { nama: values.nama, jabatan: values.jabatan, unitKerja: values.unitKerja, peran: values.peran }
      });
    }
  }

  async toggleAktif(user: User): Promise<void> {
    if (user.aktif && this.isLastActiveSuperadmin(user.id)) {
      alert('Tidak bisa menonaktifkan superadmin terakhir yang masih aktif.');
      return;
    }
    if (user.id === this.currentUserId() && user.aktif) {
      alert('Tidak bisa menonaktifkan akun Anda sendiri saat sedang masuk.');
      return;
    }

    const updated = { ...user, aktif: !user.aktif };
    try {
      await this.userRepository.update(updated);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: updated.aktif ? 'aktifkan-pengguna' : 'nonaktifkan-pengguna',
        entitas: 'User',
        entitasId: user.id,
        nilaiLama: user.aktif,
        nilaiBaru: updated.aktif
      });
    } catch (error) {
      alert(pesanGalat(error, 'Gagal mengubah status pengguna. Coba lagi.'));
    }
  }

  async resetPassword(user: User): Promise<void> {
    const confirmed = confirm(`Setel ulang kata sandi untuk ${user.nama}? Kata sandi lama tidak akan berlaku lagi.`);
    if (!confirmed) return;

    const tempPassword = generateTemporaryPassword();
    try {
      await this.userRepository.resetPassword(user.id, tempPassword);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'reset-kata-sandi',
        entitas: 'User',
        entitasId: user.id
      });
    } catch (error) {
      // Jangan tampilkan kata sandi baru kalau server belum tentu menyimpannya.
      alert(pesanGalat(error, 'Gagal menyetel ulang kata sandi. Coba lagi.'));
      return;
    }

    this.tempPasswordModal.set({ nama: user.nama, password: tempPassword });
  }

  closeTempPasswordModal(): void {
    this.tempPasswordModal.set(null);
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
