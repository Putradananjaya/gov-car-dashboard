import { PaktaIntegritas } from '../core/models/pakta-integritas.model';

export type StatusPakta = 'tidak-perlu' | 'belum-ada' | 'pemegang-berganti' | 'ada';

/**
 * Pakta integritas hanya untuk kendaraan yang dibawa perorangan. Pakta atas
 * nama pemegang lama dianggap perlu diperbarui, bukan "sudah ada".
 */
export function statusPakta(
  aset: { pemegang: string | null; isOperasionalBersama: boolean },
  pakta: PaktaIntegritas | undefined
): StatusPakta {
  if (aset.isOperasionalBersama || !aset.pemegang) return 'tidak-perlu';
  if (!pakta) return 'belum-ada';
  return pakta.pemegang === aset.pemegang ? 'ada' : 'pemegang-berganti';
}
