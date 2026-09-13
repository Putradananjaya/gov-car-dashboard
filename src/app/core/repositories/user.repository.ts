import { Signal } from '@angular/core';
import { Peran, User } from '../models/user.model';

export interface CreateUserInput {
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  peran: Peran;
  password: string;
}

export abstract class UserRepository {
  public abstract readonly ready: Promise<void>;
  public abstract readonly users: Signal<User[]>;

  public abstract findByNip(nip: string): User | undefined;
  public abstract findById(id: string): User | undefined;
  public abstract create(input: CreateUserInput): Promise<void>;
  public abstract update(user: User): Promise<void>;
  public abstract resetPassword(id: string, password: string): Promise<void>;
}
