import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoanDocumentRepository } from '../../../core/repositories/loan-document.repository';
import { LoanDocument } from '../../../core/models/loan-document.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { base64ToBlob, blobToBase64 } from '../../../shared/blob-base64';

interface LoanDocumentWire {
  id: string;
  loanId: string;
  kind: 'utama' | 'lain';
  fileName: string;
  mimeType: string;
  size: number;
  blobBase64: string;
}

function fromWire(wire: LoanDocumentWire): LoanDocument {
  return {
    id: wire.id,
    loanId: wire.loanId,
    kind: wire.kind,
    fileName: wire.fileName,
    mimeType: wire.mimeType,
    size: wire.size,
    blob: base64ToBlob(wire.blobBase64, wire.mimeType)
  };
}

@Injectable({ providedIn: 'root' })
export class HttpLoanDocumentRepository implements LoanDocumentRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private itemsSignal = signal<LoanDocument[]>([]);

  public readonly documents = this.itemsSignal.asReadonly();
  public readonly ready: Promise<void>;

  constructor() {
    this.ready = this.reload();

    effect(() => {
      if (this.authService.isLoggedIn()) {
        untracked(() => void this.reload());
      }
    });
  }

  private async reload(): Promise<void> {
    try {
      const items = await firstValueFrom(this.http.get<LoanDocumentWire[]>(`${API_BASE_URL}/loan-documents`));
      this.itemsSignal.set(items.map(fromWire));
    } catch {
      // Belum login / sesi belum pulih — bukan galat fatal untuk `ready`.
    }
  }

  public findByLoanId(loanId: string): LoanDocument[] {
    return this.itemsSignal().filter(d => d.loanId === loanId);
  }

  public async upsert(document: LoanDocument): Promise<void> {
    const blobBase64 = await blobToBase64(document.blob);
    await firstValueFrom(
      this.http.put<LoanDocumentWire>(`${API_BASE_URL}/loan-documents/${document.id}`, {
        loanId: document.loanId,
        kind: document.kind,
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.size,
        blobBase64
      })
    );
    await this.reload();
  }

  public async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/loan-documents/${id}`));
    await this.reload();
  }
}
