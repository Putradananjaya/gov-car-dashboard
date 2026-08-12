import { Signal } from '@angular/core';
import { Loan } from '../models/loan.model';

export abstract class LoanRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly loans: Signal<Loan[]>;

  public abstract findById(id: string): Loan | undefined;
  public abstract upsert(loan: Loan): Promise<void>;
  public abstract remove(id: string): Promise<void>;
}
