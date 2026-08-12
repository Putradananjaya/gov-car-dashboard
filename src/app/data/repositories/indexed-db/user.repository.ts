import { Injectable } from '@angular/core';
import { UserRepository } from '../../../core/repositories/user.repository';
import { User } from '../../../core/models/user.model';
import { IndexedDbSignalStore } from '../../db/indexed-db-store';

@Injectable({ providedIn: 'root' })
export class IndexedDbUserRepository implements UserRepository {
  private store = new IndexedDbSignalStore('users');

  public readonly ready = this.store.ready;
  public readonly users = this.store.items;

  public findByNip(nip: string): User | undefined {
    return this.users().find(u => u.nip === nip);
  }

  public findById(id: string): User | undefined {
    return this.users().find(u => u.id === id);
  }

  public updateLastLogin(id: string, timestamp: string): void {
    const user = this.users().find(u => u.id === id);
    if (!user) return;
    // Fire-and-forget: field non-kritis, tidak perlu diblokir menunggu tulis selesai.
    void this.store.put({ ...user, terakhirMasuk: timestamp });
  }

  public upsert(user: User): Promise<void> {
    return this.store.put(user);
  }
}
