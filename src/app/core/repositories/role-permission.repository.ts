import { Signal } from '@angular/core';
import { MatriksHakAkses } from '../auth/kemampuan';

export abstract class RolePermissionRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly matriks: Signal<MatriksHakAkses>;

  /** Simpan seluruh matriks sekaligus — superadmin selalu dipaksa masuk di server. */
  public abstract simpan(matriks: MatriksHakAkses): Promise<void>;

  public abstract refresh(): Promise<void>;
}
