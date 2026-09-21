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
import { RolePermissionRepository } from '../../../../core/repositories/role-permission.repository';
import { PermissionService } from '../../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../components/has-permission/has-permission.directive';
import {
  DAFTAR_KEMAMPUAN,
  InfoKemampuan,
  Kemampuan,
  LABEL_PERAN,
  LABEL_PERAN_SINGKAT,
  MatriksHakAkses,
  SEMUA_PERAN
} from '../../../../core/auth/kemampuan';
import { TanggalIdPipe } from '../../../../shared/pipes/tanggal-id.pipe';

/** Kemampuan dikelompokkan sekali di sini — isinya statis, tidak perlu computed. */
const KELOMPOK_KEMAMPUAN: { kelompok: string; isi: InfoKemampuan[] }[] = (() => {
  const peta = new Map<string, InfoKemampuan[]>();
  for (const info of DAFTAR_KEMAMPUAN) {
    const isi = peta.get(info.kelompok) ?? [];
    isi.push(info);
    peta.set(info.kelompok, isi);
  }
  return [...peta.entries()].map(([kelompok, isi]) => ({ kelompok, isi }));
})();

@Component({
  selector: 'app-pengguna-list',
  imports: [CommonModule, ReactiveFormsModule, TanggalIdPipe, HasPermissionDirective],
  templateUrl: './pengguna-list.html',
  standalone: true
})
export class PenggunaListComponent {
  private fb = inject(FormBuilder);
  private userRepository = inject(UserRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);
  private rolePermissionRepository = inject(RolePermissionRepository);
  public permissionService = inject(PermissionService);

  public users = computed(() => this.userRepository.users().slice().sort((a, b) => a.nama.localeCompare(b.nama)));

  /** Akun terhapus, yang terbaru di atas — itu yang paling mungkin dicari. */
  public usersTerhapus = computed(() =>
    this.userRepository
      .usersTerhapus()
      .slice()
      .sort((a, b) => (b.dihapusPada ?? '').localeCompare(a.dihapusPada ?? ''))
  );

  public arsipMemuat = signal(false);
  public arsipError = signal<string | null>(null);

  public opdList = KNOWN_OPD_LIST;
  public peranOptions: Peran[] = ['superadmin', 'admin', 'pegawai', 'pejabat_penatausahaan', 'pimpinan'];

  peranLabel(peran: Peran): string {
    return LABEL_PERAN[peran];
  }

  public showFormModal = signal(false);
  /**
   * Kata sandi yang SEDANG DIKETIK bisa ditampilkan penuh supaya superadmin
   * yakin tidak salah ketik sebelum menyerahkannya. Kata sandi lama pengguna
   * tidak bisa ditampilkan di mana pun: yang tersimpan hanya hash bcrypt
   * satu arah, tidak ada teks aslinya untuk dibuka.
   */
  public tampilSandiTambah = signal(false);
  public editingId = signal<string | null>(null);
  public form!: FormGroup;
  public formError = signal<string | null>(null);

  public resetTarget = signal<User | null>(null);
  public resetForm!: FormGroup;
  public isResetting = signal(false);
  public resetError = signal<string | null>(null);
  public resetSukses = signal<string | null>(null);
  /** Hasil tombol "Buat Sandi Acak", ditampilkan polos agar bisa disalin. */
  public tampilSandiAktor = signal(false);
  public tampilSandiBaru = signal(false);
  public tampilSandiKonfirmasi = signal(false);

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
    this.tampilSandiTambah.set(false);
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

  /**
   * Menghapus akun = soft delete: barisnya tetap ada di basis data lengkap
   * dengan NIP dan riwayatnya, hanya pindah ke arsip dan berhenti bisa
   * dipakai masuk. Riwayat peminjaman orang itu tidak ikut hilang — `loans`
   * menyimpan salinan data pemohon, bukan sambungan ke tabel pengguna.
   *
   * Menonaktifkan tetap ada dan tetap berbeda maksudnya: akun nonaktif masih
   * terlihat di daftar (mis. sedang cuti panjang), akun terhapus tidak.
   */
  async hapusPengguna(user: User): Promise<void> {
    if (user.id === this.currentUserId()) {
      alert('Tidak bisa menghapus akun Anda sendiri saat sedang masuk.');
      return;
    }
    if (this.isLastActiveSuperadmin(user.id)) {
      alert('Tidak bisa menghapus superadmin terakhir yang masih aktif.');
      return;
    }

    const alasan = prompt(
      `Hapus akun "${user.nama}" dari daftar?\n\n` +
        'Datanya tetap tersimpan di basis data dan bisa dipulihkan lewat tab ' +
        '"Pengguna Terhapus". Tulis alasan penghapusan:'
    );
    if (!alasan) return;

    try {
      await this.userRepository.softDelete(user.id);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'hapus-pengguna',
        entitas: 'User',
        entitasId: user.id,
        nilaiLama: { nama: user.nama, nip: user.nip, peran: user.peran, unitKerja: user.unitKerja },
        nilaiBaru: `Dihapus dari daftar. Alasan: ${alasan}`
      });
    } catch (error) {
      alert(pesanGalat(error, 'Gagal menghapus pengguna. Coba lagi.'));
    }
  }

  async pulihkanPengguna(user: User): Promise<void> {
    if (!confirm(`Pulihkan akun "${user.nama}"? Akun akan muncul lagi di daftar pengguna.`)) return;

    try {
      await this.userRepository.restore(user.id);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'pulihkan-pengguna',
        entitas: 'User',
        entitasId: user.id,
        nilaiBaru: { nama: user.nama, nip: user.nip, peran: user.peran, unitKerja: user.unitKerja }
      });
    } catch (error) {
      alert(pesanGalat(error, 'Gagal memulihkan pengguna. Coba lagi.'));
    }
  }

  /**
   * Arsip tidak ikut dimuat saat halaman dibuka — baru ditarik saat tabnya
   * dipilih, dan ditarik ulang setiap kali supaya tidak menampilkan daftar
   * basi kalau superadmin lain menghapus akun di sela-sela.
   */
  async bukaArsip(): Promise<void> {
    this.tab.set('arsip');
    this.arsipError.set(null);
    this.arsipMemuat.set(true);
    try {
      await this.userRepository.muatTerhapus();
    } catch (error) {
      this.arsipError.set(pesanGalat(error, 'Gagal memuat daftar pengguna terhapus.'));
    } finally {
      this.arsipMemuat.set(false);
    }
  }

  bukaReset(user: User): void {
    this.resetTarget.set(user);
    this.tampilSandiAktor.set(false);
    this.tampilSandiBaru.set(false);
    this.tampilSandiKonfirmasi.set(false);
    this.resetError.set(null);
    this.resetSukses.set(null);
    this.resetForm = this.fb.group({
      kataSandiLama: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      konfirmasi: ['', Validators.required]
    });
  }

  tutupReset(): void {
    this.resetTarget.set(null);
    this.resetError.set(null);
  }

  buatSandiAcak(): void {
    const sandi = generateTemporaryPassword();
    this.resetForm.patchValue({ password: sandi, konfirmasi: sandi });
    // Sandi acak tidak ada gunanya kalau tidak terbaca — langsung dibuka
    // supaya bisa disalin sebelum diserahkan.
    this.tampilSandiBaru.set(true);
    this.tampilSandiKonfirmasi.set(true);
  }

  async simpanReset(): Promise<void> {
    const target = this.resetTarget();
    if (!target) return;

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { kataSandiLama, password, konfirmasi } = this.resetForm.getRawValue();
    if (password !== konfirmasi) {
      this.resetError.set('Kata sandi baru dan ulangannya tidak sama.');
      return;
    }

    this.isResetting.set(true);
    this.resetError.set(null);

    try {
      await this.userRepository.resetPassword(target.id, password, kataSandiLama);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'reset-kata-sandi',
        entitas: 'User',
        entitasId: target.id
      });
      this.resetSukses.set(target.nama);
      this.resetTarget.set(null);
    } catch (error) {
      // Kata sandi superadmin salah, atau server menolak — jangan tutup modal
      // supaya isian yang sudah diketik tidak hilang.
      this.resetError.set(pesanGalat(error, 'Gagal menyetel ulang kata sandi. Coba lagi.'));
    } finally {
      this.isResetting.set(false);
    }
  }

  tutupSukses(): void {
    this.resetSukses.set(null);
  }

  // ---------- Tab "Hak Akses Peran" ----------

  public tab = signal<'pengguna' | 'arsip' | 'akses'>('pengguna');
  public kelompokKemampuan = KELOMPOK_KEMAMPUAN;
  public peranKolom = SEMUA_PERAN;
  public labelPeranSingkat = LABEL_PERAN_SINGKAT;

  /** Suntingan yang belum disimpan; null berarti mengikuti matriks dari server. */
  private draf = signal<MatriksHakAkses | null>(null);
  public isSavingAkses = signal(false);
  public aksesError = signal<string | null>(null);
  public aksesTersimpan = signal(false);

  public matriksTampil = computed(() => this.draf() ?? this.rolePermissionRepository.matriks());
  public adaPerubahan = computed(() => {
    const draf = this.draf();
    if (!draf) return false;
    return JSON.stringify(draf) !== JSON.stringify(this.rolePermissionRepository.matriks());
  });

  public dicentang(kemampuan: Kemampuan, peran: Peran): boolean {
    return this.matriksTampil()[kemampuan].includes(peran);
  }

  public ubahIzin(kemampuan: Kemampuan, peran: Peran): void {
    const sekarang = this.matriksTampil();
    const daftar = sekarang[kemampuan];
    const baru = daftar.includes(peran) ? daftar.filter(p => p !== peran) : [...daftar, peran];

    this.draf.set({ ...sekarang, [kemampuan]: baru });
    this.aksesTersimpan.set(false);
    this.aksesError.set(null);
  }

  public batalkanAkses(): void {
    this.draf.set(null);
    this.aksesError.set(null);
    this.aksesTersimpan.set(false);
  }

  public async simpanAkses(): Promise<void> {
    const draf = this.draf();
    if (!draf || !this.adaPerubahan()) return;

    const sebelum = this.rolePermissionRepository.matriks();
    const berubah = DAFTAR_KEMAMPUAN.map(info => info.kemampuan).filter(
      k => JSON.stringify(sebelum[k]) !== JSON.stringify(draf[k])
    );

    this.isSavingAkses.set(true);
    this.aksesError.set(null);

    try {
      await this.rolePermissionRepository.simpan(draf);
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'ubah-hak-akses',
        entitas: 'HakAkses',
        entitasId: berubah.join(', '),
        // Cukup kemampuan yang benar-benar berubah — mencatat seluruh matriks
        // membuat jejak audit sulit dibaca.
        nilaiLama: Object.fromEntries(berubah.map(k => [k, sebelum[k]])),
        nilaiBaru: Object.fromEntries(berubah.map(k => [k, draf[k]]))
      });
      this.draf.set(null);
      this.aksesTersimpan.set(true);
    } catch (error) {
      this.aksesError.set(pesanGalat(error, 'Gagal menyimpan hak akses. Coba lagi.'));
    } finally {
      this.isSavingAkses.set(false);
    }
  }

  isInvalidReset(controlName: string): boolean {
    const control = this.resetForm?.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isInvalid(controlName: string): boolean {
    const control = this.form?.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
