import { Signal } from '@angular/core';
import { LoanDocument } from '../models/loan-document.model';

export abstract class LoanDocumentRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly documents: Signal<LoanDocument[]>;

  public abstract findByLoanId(loanId: string): LoanDocument[];
  public abstract upsert(document: LoanDocument): Promise<void>;
  public abstract remove(id: string): Promise<void>;
}
