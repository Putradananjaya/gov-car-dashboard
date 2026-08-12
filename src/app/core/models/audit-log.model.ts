export interface AuditLog {
  id: string;
  waktu: string;
  pelakuId: string;
  pelakuNama: string;
  aksi: string;
  entitas: string;
  entitasId: string;
  nilaiLama?: unknown;
  nilaiBaru?: unknown;
}
