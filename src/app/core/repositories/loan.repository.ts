import { Signal } from '@angular/core';
import { KondisiAset, Loan } from '../models/loan.model';

export interface SerahTerimaPayload {
  odometerKeluar: number;
  bbmKeluar: number;
  kondisiKeluar: KondisiAset;
  catatanKondisiKeluar: string | null;
  kunciDiserahkan: boolean;
}

export interface KembalikanPayload {
  odometerMasuk: number;
  bbmMasuk: number;
  kondisiMasuk: KondisiAset;
  catatanKondisiMasuk: string | null;
  kunciDikembalikan: boolean;
}

export abstract class LoanRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly loans: Signal<Loan[]>;

  public abstract findById(id: string): Loan | undefined;
  public abstract upsert(loan: Loan): Promise<void>;
  public abstract remove(id: string): Promise<void>;

  public abstract setujuiTahap1(id: string): Promise<Loan>;
  public abstract serahTerima(id: string, payload: SerahTerimaPayload): Promise<Loan>;
  public abstract tolak(id: string, catatanPenolakan: string): Promise<Loan>;
  public abstract kembalikan(id: string, payload: KembalikanPayload): Promise<Loan>;

  /** Muat ulang dari server — dipakai oleh DataSyncService supaya perubahan
   * dari pengguna/perangkat lain ikut tampil tanpa memuat ulang halaman. */
  public abstract refresh(): Promise<void>;
}
