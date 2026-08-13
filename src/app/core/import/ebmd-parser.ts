import { read, utils } from 'xlsx';
import { COLUMN, FIRST_DETAIL_ROW_INDEX, KODE_BARANG_COLUMNS, KOP_ROW, KOP_VALUE_COLUMN } from './column-map';
import { collapseSpaces, excelSerialToIso, parseIndonesianDate, parseMerekTipe, parseNomorPolisi, parsePemegang } from './normalizers';
import { RowForBatchValidation, RowForRowValidation, ValidationIssue, validateBatch, validateRow } from './validators';
import { VehicleAsset } from '../models/vehicle-asset.model';
import { ServiceRecord } from '../models/service-record.model';

export interface ParsedKop {
  tahunAnggaran: number;
  penggunaBarang: string;
  kodeLokasi: string;
}

export interface ParsedImportResult {
  kop: ParsedKop;
  assets: VehicleAsset[];
  serviceRecords: ServiceRecord[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Baris rekap/kosong yang bukan baris detail (kolom Nomor Polisi kosong) — dilewati, bukan ditolak. */
  skippedRowCount: number;
  /** Nomor baris asli (1-indexed) per NIBAR yang diterima — dipakai memetakan anchor foto ke NIBAR. */
  rowNumberByNibar: Record<string, number>;
}

export interface ParseEbmdMeta {
  sumberImporId: string;
}

function parseKop(rows: unknown[][]): ParsedKop {
  const tahunText = collapseSpaces(rows[KOP_ROW.TAHUN_ANGGARAN]?.[0]);
  const tahunMatch = tahunText.match(/(\d{4})/);

  return {
    tahunAnggaran: tahunMatch ? Number(tahunMatch[1]) : new Date().getFullYear(),
    penggunaBarang: collapseSpaces(rows[KOP_ROW.PENGGUNA_BARANG]?.[KOP_VALUE_COLUMN]),
    kodeLokasi: collapseSpaces(rows[KOP_ROW.KODE_LOKASI]?.[KOP_VALUE_COLUMN])
  };
}

function buildKodeBarangFull(row: unknown[]): string {
  const segments = [
    KODE_BARANG_COLUMNS.AKUN,
    KODE_BARANG_COLUMNS.KELOMPOK,
    KODE_BARANG_COLUMNS.JENIS,
    KODE_BARANG_COLUMNS.OBJEK,
    KODE_BARANG_COLUMNS.RINCIAN_OBJEK,
    KODE_BARANG_COLUMNS.SUB_RINCIAN,
    KODE_BARANG_COLUMNS.SUB_SUB
  ].map(col => collapseSpaces(row[col]));

  return segments.join('.');
}

export function parseEbmdWorkbook(buffer: ArrayBuffer, meta: ParseEbmdMeta, now: Date = new Date()): ParsedImportResult {
  const workbook = read(buffer, { type: 'array', cellDates: false, raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

  const kop = parseKop(rows);

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const assets: VehicleAsset[] = [];
  const serviceRecords: ServiceRecord[] = [];
  const batchRows: RowForBatchValidation[] = [];
  const rowNumberByNibar: Record<string, number> = {};
  let skippedRowCount = 0;

  for (let i = FIRST_DETAIL_ROW_INDEX; i < rows.length; i++) {
    const raw = rows[i] ?? [];
    const nomorPolisiCell = raw[COLUMN.NOMOR_POLISI];

    // Baris rekap/kelompok dan baris kosong tidak punya nomor polisi — inilah
    // penanda paling andal untuk baris detail (dokumen v2 bag. 4.1).
    if (nomorPolisiCell === '' || nomorPolisiCell === undefined || nomorPolisiCell === null) {
      skippedRowCount++;
      continue;
    }

    const rowNumber = i + 1;
    const nibar = collapseSpaces(raw[COLUMN.NIBAR]);
    const { nomorPolisi, catatan: catatanNomorPolisi } = parseNomorPolisi(nomorPolisiCell);
    const nilaiPerolehan = Number(raw[COLUMN.NILAI_PEROLEHAN]);
    const tanggalPerolehanIso = excelSerialToIso(raw[COLUMN.TANGGAL_PEROLEHAN]);

    const rowValidation: RowForRowValidation = { rowNumber, nibar, nomorPolisi, nilaiPerolehan, tanggalPerolehanIso };
    const rowErrors = validateRow(rowValidation);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue; // baris ditolak — tidak ditebak, tidak masuk hasil
    }

    const { merek, tipe } = parseMerekTipe(raw[COLUMN.MEREK_TIPE]);
    const { pemegang, isOperasionalBersama } = parsePemegang(raw[COLUMN.PENGGUNA]);
    const nomorRangka = collapseSpaces(raw[COLUMN.NOMOR_RANGKA]);
    const nomorBpkbText = collapseSpaces(raw[COLUMN.NOMOR_BPKB]);
    const masaBerlakuPajakIso = parseIndonesianDate(raw[COLUMN.MASA_BERLAKU_PAJAK]);
    const masaBerlakuStnkIso = parseIndonesianDate(raw[COLUMN.MASA_BERLAKU_STNK]);
    const jumlah = Number(raw[COLUMN.JUMLAH]);

    if (catatanNomorPolisi) {
      warnings.push({ level: 'warning', rowNumber, nibar, message: catatanNomorPolisi });
    }

    const asset: VehicleAsset = {
      nibar,
      nomorRegister: collapseSpaces(raw[COLUMN.NOMOR_REGISTER]),
      kodeBarang: {
        akun: collapseSpaces(raw[KODE_BARANG_COLUMNS.AKUN]),
        kelompok: collapseSpaces(raw[KODE_BARANG_COLUMNS.KELOMPOK]),
        jenis: collapseSpaces(raw[KODE_BARANG_COLUMNS.JENIS]),
        objek: collapseSpaces(raw[KODE_BARANG_COLUMNS.OBJEK]),
        rincianObjek: collapseSpaces(raw[KODE_BARANG_COLUMNS.RINCIAN_OBJEK]),
        subRincian: collapseSpaces(raw[KODE_BARANG_COLUMNS.SUB_RINCIAN]),
        subSub: collapseSpaces(raw[KODE_BARANG_COLUMNS.SUB_SUB]),
        full: buildKodeBarangFull(raw)
      },
      namaBarang: collapseSpaces(raw[COLUMN.NAMA_BARANG]),
      spesifikasiNama: collapseSpaces(raw[COLUMN.SPESIFIKASI_NAMA]),
      spesifikasiLainnya: collapseSpaces(raw[COLUMN.SPESIFIKASI_LAINNYA]),
      merekTipe: collapseSpaces(raw[COLUMN.MEREK_TIPE]),
      merek,
      tipe,
      lokasi: collapseSpaces(raw[COLUMN.LOKASI]),
      nomorPolisi,
      nomorRangka,
      nomorBpkb: nomorBpkbText || null,
      jumlah: Number.isFinite(jumlah) && jumlah > 0 ? jumlah : 1,
      satuan: collapseSpaces(raw[COLUMN.SATUAN]) || 'unit',
      hargaSatuanPerolehan: Number(raw[COLUMN.HARGA_SATUAN_PEROLEHAN]) || 0,
      nilaiPerolehan,
      caraPerolehan: collapseSpaces(raw[COLUMN.CARA_PEROLEHAN]),
      tanggalPerolehan: tanggalPerolehanIso ?? '',
      statusPenggunaan: collapseSpaces(raw[COLUMN.STATUS_PENGGUNAAN]),
      pemegang,
      isOperasionalBersama,
      fotoId: null, // diisi tahap ekstraksi foto (giliran berikutnya)
      masaBerlakuPajak: masaBerlakuPajakIso ?? '',
      masaBerlakuStnk: masaBerlakuStnkIso ?? '',
      tahunAnggaran: kop.tahunAnggaran,
      kodeLokasi: kop.kodeLokasi,
      sumberImporId: meta.sumberImporId,
      dihapusPada: null
    };

    assets.push(asset);
    rowNumberByNibar[nibar] = rowNumber;
    batchRows.push({ rowNumber, nibar, nomorRangka, nomorBpkb: nomorBpkbText || null, tanggalPerolehanIso, masaBerlakuPajakIso, masaBerlakuStnkIso });

    const riwayatServisUraian = collapseSpaces(raw[COLUMN.RIWAYAT_SERVIS]);
    if (riwayatServisUraian) {
      const biayaRaw = Number(raw[COLUMN.JUMLAH_HARGA]);
      serviceRecords.push({
        id: `${nibar}-servis-${kop.tahunAnggaran}`,
        nibar,
        tahun: kop.tahunAnggaran,
        uraian: riwayatServisUraian,
        odometerKm: null,
        biaya: Number.isFinite(biayaRaw) && biayaRaw > 0 ? biayaRaw : null,
        tanggal: null,
        sumber: 'impor'
      });
    }
  }

  warnings.push(...validateBatch(batchRows, now));

  return { kop, assets, serviceRecords, errors, warnings, skippedRowCount, rowNumberByNibar };
}
