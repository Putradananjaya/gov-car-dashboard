import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { Kemampuan, MATRIKS_BAWAAN } from './kemampuan';

export type { Kemampuan } from './kemampuan';

/**
 * Pembaca matriks hak akses. Matriksnya sendiri bukan lagi konstanta di kode,
 * melainkan data yang disunting superadmin lewat Manajemen Pengguna dan
 * disimpan di server (lihat RolePermissionRepository).
 *
 * Yang di sini hanya menentukan menu & tombol mana yang tampil. Penegakan
 * sesungguhnya ada di IzinGuard sisi server — menyembunyikan tombol saja tidak
 * menghentikan siapa pun yang memanggil API langsung.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private authService = inject(AuthService);
  private repository = inject(RolePermissionRepository);

  public readonly matriks = computed(() => this.repository.matriks());

  public can(kemampuan: Kemampuan): boolean {
    const peran = this.authService.peran();
    if (!peran) return false;

    // Superadmin dikunci penuh: tidak bisa mencabut haknya sendiri lalu
    // terkunci dari halaman pengaturannya sendiri. Server menerapkan aturan
    // yang sama.
    if (peran === 'superadmin') return true;

    const diizinkan = this.matriks()[kemampuan] ?? MATRIKS_BAWAAN[kemampuan];
    return diizinkan.includes(peran);
  }

  /** Cukup salah satu — dipakai menu yang membuka beberapa aksi sekaligus. */
  public canAny(...kemampuan: Kemampuan[]): boolean {
    return kemampuan.some(k => this.can(k));
  }
}
