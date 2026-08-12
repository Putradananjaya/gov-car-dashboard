import { Injectable } from '@angular/core';
import { LoanRepository } from '../../../core/repositories/loan.repository';
import { Loan } from '../../../core/models/loan.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbLoanRepository implements LoanRepository {
  private store = new IndexedDbSignalStore('loans');

  public readonly ready = this.store.ready;
  public readonly loans = this.store.items;

  public findById(id: string): Loan | undefined {
    return this.loans().find(l => l.id === id);
  }

  public upsert(loan: Loan): Promise<void> {
    return this.store.put(loan);
  }

  public remove(id: string): Promise<void> {
    return this.store.delete(id);
  }
}
