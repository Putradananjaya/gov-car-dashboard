import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { LoanDocumentRepository } from '../../../../core/repositories/loan-document.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { AuthService } from '../../../../core/auth/auth.service';
import { JenisKendaraan, JenisPermohonan, Loan, StatusPermohonan, TingkatUrgensi } from '../../../../core/models/loan.model';
import { LoanDocument } from '../../../../core/models/loan-document.model';
import { TanggalIdPipe } from '../../../../shared/pipes/tanggal-id.pipe';

const MAX_UKURAN_BERKAS = 5 * 1024 * 1024; // 5MB
const TIPE_BERKAS_DIIZINKAN = ['application/pdf', 'image/jpeg', 'image/png'];

@Component({
  selector: 'app-peminjaman-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TanggalIdPipe],
  templateUrl: './peminjaman-form.html',
  standalone: true
})
export class PeminjamanFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private loanDocumentRepository = inject(LoanDocumentRepository);
  private auditRepository = inject(AuditRepository);
  private authService = inject(AuthService);

  public currentUser = this.authService.currentUser;
  private isAdmin = computed(() => this.authService.peran() === 'admin');

  public form!: FormGroup;
  public isEditMode = false;
  public isSaving = signal(false);
  public saveError = signal<string | null>(null);
  public tanggalPermohonan = new Date().toISOString().slice(0, 10);

  public statusPermohonanOptions: StatusPermohonan[] = ['Baru', 'Perubahan', 'Darurat'];
  public jenisPermohonanOptions: JenisPermohonan[] = ['Penggunaan', 'Peminjaman'];
  public tingkatUrgensiOptions: TingkatUrgensi[] = ['Biasa', 'Penting', 'Mendesak/Darurat'];
  public jenisKendaraanOptions: JenisKendaraan[] = ['Roda 2', 'Roda 4', 'Lainnya'];

  private loanId = this.generateLoanId();
  private existingLoan: Loan | null = null;

  public availableVehicles = computed(() => {
    const operationalByNibar = new Map(this.operationalRepository.operational().map(o => [o.nibar, o]));
    const unitKerja = this.currentUser()?.unitKerja;

    const tersedia = this.assetRepository.assets()
      .filter(a => !a.dihapusPada)
      .filter(a => operationalByNibar.get(a.nibar)?.status === 'Tersedia')
      .filter(a => !this.isAdmin() || a.statusPenggunaan === unitKerja);

    const nibarTerpilih = this.form?.get('nibar')?.value;
    if (nibarTerpilih && !tersedia.some(a => a.nibar === nibarTerpilih)) {
      const asetTerpilih = this.assetRepository.findByNibar(nibarTerpilih);
      if (asetTerpilih) return [...tersedia, asetTerpilih];
    }

    return tersedia;
  });

  // Dokumen pendukung (Surat Tugas/Undangan) — opsional, satu berkas utama.
  public mainDocumentFile = signal<File | null>(null);
  public mainDocumentError = signal<string | null>(null);
  public existingMainDocument = signal<LoanDocument | null>(null);
  public mainDocumentRemoved = signal(false);

  // Dokumen lain — opsional, boleh lebih dari satu.
  public otherDocumentFiles = signal<File[]>([]);
  public otherDocumentError = signal<string | null>(null);
  public existingOtherDocuments = signal<LoanDocument[]>([]);
  private otherDocumentIdsToDelete: string[] = [];

  ngOnInit(): void {
    this.buildForm();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadDraft(id);
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.group({
      statusPermohonan: ['Baru' as StatusPermohonan, Validators.required],
      jenisPermohonan: ['Peminjaman' as JenisPermohonan, Validators.required],
      noHp: ['', Validators.required],
      namaPengemudi: [''],
      nibar: ['', Validators.required],
      keperluan: ['', Validators.required],
      tujuan: ['', Validators.required],
      rute: ['', Validators.required],
      rencanaMulai: ['', Validators.required],
      rencanaSelesai: ['', Validators.required],
      nomorSurat: [''],
      tanggalSurat: [''],
      tingkatUrgensi: ['Biasa' as TingkatUrgensi, Validators.required],
      jenisKendaraan: ['Roda 4' as JenisKendaraan, Validators.required],
      jenisKendaraanLainnya: [''],
      kapasitasSpesifikasi: [''],
      keteranganTambahan: [''],
      pernyataan: [false, Validators.requiredTrue]
    });
  }

  private loadDraft(id: string): void {
    const loan = this.loanRepository.findById(id);
    if (!loan || loan.pemohonId !== this.currentUser()?.id || loan.status !== 'Draft') {
      this.router.navigate(['/app/peminjaman']);
      return;
    }

    this.loanId = loan.id;
    this.existingLoan = loan;
    this.isEditMode = true;

    this.form.patchValue({
      statusPermohonan: loan.statusPermohonan,
      jenisPermohonan: loan.jenisPermohonan,
      noHp: loan.pemohon.noHp,
      namaPengemudi: loan.namaPengemudi ?? '',
      nibar: loan.nibar,
      keperluan: loan.keperluan,
      tujuan: loan.tujuan,
      rute: loan.rute ?? '',
      rencanaMulai: loan.rencanaMulai,
      rencanaSelesai: loan.rencanaSelesai,
      nomorSurat: loan.nomorSurat ?? '',
      tanggalSurat: loan.tanggalSurat ?? '',
      tingkatUrgensi: loan.tingkatUrgensi,
      jenisKendaraan: loan.jenisKendaraan,
      jenisKendaraanLainnya: loan.jenisKendaraanLainnya ?? '',
      kapasitasSpesifikasi: loan.kapasitasSpesifikasi ?? '',
      keteranganTambahan: loan.keteranganTambahan ?? ''
    });

    const dokumen = this.loanDocumentRepository.findByLoanId(loan.id);
    this.existingMainDocument.set(dokumen.find(d => d.kind === 'utama') ?? null);
    this.existingOtherDocuments.set(dokumen.filter(d => d.kind === 'lain'));
  }

  private generateLoanId(): string {
    return `loan-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  formatUkuran(bytes: number): string {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  onMainFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setMainFile(input.files?.[0] ?? null);
    input.value = '';
  }

  onMainFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.setMainFile(event.dataTransfer?.files?.[0] ?? null);
  }

  private setMainFile(file: File | null): void {
    if (!file) return;
    this.mainDocumentError.set(null);

    if (!TIPE_BERKAS_DIIZINKAN.includes(file.type)) {
      this.mainDocumentError.set('Format berkas harus PDF, JPG, atau PNG.');
      return;
    }
    if (file.size > MAX_UKURAN_BERKAS) {
      this.mainDocumentError.set('Ukuran berkas melebihi 5 MB.');
      return;
    }

    this.mainDocumentFile.set(file);
    this.mainDocumentRemoved.set(false);
  }

  removeMainFile(): void {
    this.mainDocumentFile.set(null);
    this.mainDocumentError.set(null);
    if (this.existingMainDocument()) {
      this.mainDocumentRemoved.set(true);
    }
  }

  onOtherFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addOtherFiles(input.files);
    input.value = '';
  }

  onOtherFilesDropped(event: DragEvent): void {
    event.preventDefault();
    this.addOtherFiles(event.dataTransfer?.files ?? null);
  }

  private addOtherFiles(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) return;
    this.otherDocumentError.set(null);

    const diterima: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!TIPE_BERKAS_DIIZINKAN.includes(file.type)) {
        this.otherDocumentError.set(`"${file.name}" dilewati — format harus PDF, JPG, atau PNG.`);
        continue;
      }
      if (file.size > MAX_UKURAN_BERKAS) {
        this.otherDocumentError.set(`"${file.name}" dilewati — ukuran melebihi 5 MB.`);
        continue;
      }
      diterima.push(file);
    }

    this.otherDocumentFiles.update(files => [...files, ...diterima]);
  }

  removeOtherFile(index: number): void {
    this.otherDocumentFiles.update(files => files.filter((_, i) => i !== index));
  }

  removeExistingOtherDocument(doc: LoanDocument): void {
    this.otherDocumentIdsToDelete.push(doc.id);
    this.existingOtherDocuments.update(docs => docs.filter(d => d.id !== doc.id));
  }

  private actorLabel(): string {
    return this.currentUser()?.nama ?? 'sistem';
  }

  private actorId(): string {
    return this.currentUser()?.id ?? '';
  }

  private buildLoan(status: Loan['status']): Loan {
    const values = this.form.value;
    const user = this.currentUser();

    return {
      id: this.loanId,
      nibar: values.nibar,
      pemohonId: this.actorId(),
      pemohon: {
        nama: user?.nama ?? '',
        nip: user?.nip ?? '',
        jabatan: user?.jabatan ?? '',
        unitKerja: user?.unitKerja ?? '',
        noHp: values.noHp
      },
      statusPermohonan: values.statusPermohonan,
      jenisPermohonan: values.jenisPermohonan,
      namaPengemudi: values.namaPengemudi?.trim() || null,
      keperluan: values.keperluan,
      tujuan: values.tujuan,
      rute: values.rute?.trim() || null,
      rencanaMulai: values.rencanaMulai,
      rencanaSelesai: values.rencanaSelesai,
      nomorSurat: values.nomorSurat?.trim() || null,
      tanggalSurat: values.tanggalSurat || null,
      tingkatUrgensi: values.tingkatUrgensi,
      jenisKendaraan: values.jenisKendaraan,
      jenisKendaraanLainnya: values.jenisKendaraan === 'Lainnya' ? values.jenisKendaraanLainnya?.trim() || null : null,
      kapasitasSpesifikasi: values.kapasitasSpesifikasi?.trim() || null,
      keteranganTambahan: values.keteranganTambahan?.trim() || null,
      realisasiKembali: this.existingLoan?.realisasiKembali ?? null,
      status,
      disetujuiOleh: this.existingLoan?.disetujuiOleh ?? null,
      catatanPenolakan: this.existingLoan?.catatanPenolakan ?? null,
      odometerKeluar: this.existingLoan?.odometerKeluar ?? null,
      odometerMasuk: this.existingLoan?.odometerMasuk ?? null,
      bbmKeluar: this.existingLoan?.bbmKeluar ?? null,
      bbmMasuk: this.existingLoan?.bbmMasuk ?? null,
      kondisiKeluar: this.existingLoan?.kondisiKeluar ?? null,
      kondisiMasuk: this.existingLoan?.kondisiMasuk ?? null,
      catatanKondisiKeluar: this.existingLoan?.catatanKondisiKeluar ?? null,
      catatanKondisiMasuk: this.existingLoan?.catatanKondisiMasuk ?? null,
      kunciDiserahkanPada: this.existingLoan?.kunciDiserahkanPada ?? null,
      kunciDikembalikanPada: this.existingLoan?.kunciDikembalikanPada ?? null
    };
  }

  private async persistDocuments(): Promise<void> {
    const mainDocId = `${this.loanId}-utama`;
    const mainFile = this.mainDocumentFile();

    if (mainFile) {
      await this.loanDocumentRepository.upsert({
        id: mainDocId,
        loanId: this.loanId,
        kind: 'utama',
        fileName: mainFile.name,
        mimeType: mainFile.type,
        size: mainFile.size,
        blob: mainFile
      });
    } else if (this.mainDocumentRemoved() && this.existingMainDocument()) {
      await this.loanDocumentRepository.remove(mainDocId);
    }

    for (const id of this.otherDocumentIdsToDelete) {
      await this.loanDocumentRepository.remove(id);
    }
    this.otherDocumentIdsToDelete = [];

    const newFiles = this.otherDocumentFiles();
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      await this.loanDocumentRepository.upsert({
        id: `${this.loanId}-lain-${Date.now()}-${i}`,
        loanId: this.loanId,
        kind: 'lain',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        blob: file
      });
    }
    this.otherDocumentFiles.set([]);
  }

  hasMainDocument(): boolean {
    return !!this.mainDocumentFile() || (!!this.existingMainDocument() && !this.mainDocumentRemoved());
  }

  async simpanDraf(): Promise<void> {
    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const loan = this.buildLoan('Draft');
      await this.loanRepository.upsert(loan);
      await this.persistDocuments();
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'simpan-draf-peminjaman',
        entitas: 'Loan',
        entitasId: loan.id,
        nilaiBaru: loan
      });

      this.router.navigate(['/app/peminjaman']);
    } catch (error) {
      console.error('Gagal menyimpan draf:', error);
      this.saveError.set('Gagal menyimpan draf. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async ajukanPermohonan(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const loan = this.buildLoan('Diajukan');
      await this.loanRepository.upsert(loan);
      await this.persistDocuments();
      await this.auditRepository.append({
        pelakuId: this.actorId(),
        pelakuNama: this.actorLabel(),
        aksi: 'ajukan-peminjaman',
        entitas: 'Loan',
        entitasId: loan.id,
        nilaiBaru: loan
      });

      this.router.navigate(['/app/peminjaman']);
    } catch (error) {
      console.error('Gagal mengajukan permohonan:', error);
      this.saveError.set('Gagal mengajukan permohonan. Periksa koneksi Anda dan coba lagi.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
