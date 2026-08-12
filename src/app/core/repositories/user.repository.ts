import { Signal } from '@angular/core';
import { User } from '../models/user.model';

export abstract class UserRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly users: Signal<User[]>;

  public abstract findByNip(nip: string): User | undefined;
  public abstract findById(id: string): User | undefined;
  public abstract updateLastLogin(id: string, timestamp: string): void;
  public abstract upsert(user: User): Promise<void>;
}
