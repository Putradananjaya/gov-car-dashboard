import { WritableSignal } from '@angular/core';

/**
 * Pembungkus tulis-signal yang mengabaikan muatan identik.
 *
 * DataSyncService menarik ulang koleksi ini tiap beberapa puluh detik, dan
 * sebagian besar putaran mengembalikan data yang sama persis. Tanpa penjagaan
 * ini setiap putaran menghasilkan array baru, sehingga seluruh computed dan
 * tampilan yang bergantung padanya dihitung & digambar ulang percuma.
 */
export class MuatanSignal<T> {
  private sidikJari: string | null = null;

  constructor(private readonly target: WritableSignal<T[]>) {}

  public set(items: T[]): void {
    const sidikJari = JSON.stringify(items);
    if (sidikJari === this.sidikJari) return;

    this.sidikJari = sidikJari;
    this.target.set(items);
  }
}
