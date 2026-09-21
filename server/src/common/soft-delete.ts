import { DeleteDateColumn } from 'typeorm';
import type { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/**
 * Basis untuk entity yang penghapusannya selalu *soft delete*: barisnya tetap
 * ada di Postgres, hanya disembunyikan dari seluruh pembacaan.
 *
 * Yang dipakai adalah `@DeleteDateColumn` bawaan TypeORM — bukan kolom penanda
 * biasa — karena TypeORM otomatis menambahkan `WHERE dihapus_pada IS NULL` ke
 * setiap `find*()` dan QueryBuilder entity ini. Artinya tidak ada satu pun
 * jalur baca yang bisa lupa menyaring baris terhapus, dan frontend tidak perlu
 * tahu-menahu soal itu: data yang sudah dihapus memang tidak pernah terkirim.
 * Untuk sengaja melihatnya (arsip/pemulihan) pakai `withDeleted: true`.
 *
 * Catatan tipe kolom: seluruh aplikasi ini menyimpan waktu sebagai string ISO
 * di kolom `varchar`, tapi `@DeleteDateColumn` harus kolom tanggal sungguhan
 * supaya TypeORM bisa mengisinya sendiri — jadi di sini `timestamptz`, sama
 * seperti `refresh_tokens.expires_at`.
 */
export abstract class EntitasSoftDelete {
  @DeleteDateColumn({ name: 'dihapus_pada', type: 'timestamptz', nullable: true })
  dihapusPada!: Date | null;
}

/**
 * Bersihkan penanda soft delete sebelum menyimpan ulang baris dengan primary
 * key yang sama — panggil ini di awal setiap `upsert()`.
 *
 * `save()` sendiri sudah aman: pencarian baris "sudah ada atau belum" yang
 * menentukan INSERT-atau-UPDATE memakai `withDeleted: true`, jadi id yang
 * pernah dihapus tetap ter-UPDATE, bukan menabrak primary key. Yang TIDAK
 * dilakukannya adalah mencabut penandanya: tanpa langkah ini, barisnya
 * tersimpan dengan isi baru tapi tetap tidak terbaca oleh siapa pun — persis
 * kebingungan "sudah saya simpan, kok tidak muncul". Jadi menyimpan ulang id
 * yang pernah dihapus berarti memulihkannya.
 *
 * Aman dipanggil untuk id yang belum ada maupun yang tidak pernah dihapus —
 * keduanya sekadar UPDATE tanpa baris terdampak.
 */
export async function pulihkanBilaPernahDihapus<T extends ObjectLiteral>(
  repository: Repository<T>,
  kriteria: FindOptionsWhere<T>
): Promise<void> {
  await repository.restore(kriteria);
}
