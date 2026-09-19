import { signal } from '@angular/core';
import { MuatanSignal } from './muatan-signal';

describe('MuatanSignal', () => {
  it('menulis muatan pertama', () => {
    const target = signal<{ id: string }[]>([]);
    new MuatanSignal(target).set([{ id: 'a' }]);

    expect(target()).toEqual([{ id: 'a' }]);
  });

  it('tidak mengganti referensi array saat muatannya sama persis', () => {
    const target = signal<{ id: string }[]>([]);
    const muatan = new MuatanSignal(target);

    muatan.set([{ id: 'a' }]);
    const sebelumnya = target();
    muatan.set([{ id: 'a' }]);

    expect(target()).toBe(sebelumnya);
  });

  it('menulis ulang begitu ada perubahan isi', () => {
    const target = signal<{ id: string }[]>([]);
    const muatan = new MuatanSignal(target);

    muatan.set([{ id: 'a' }]);
    muatan.set([{ id: 'a' }, { id: 'b' }]);

    expect(target().length).toBe(2);
  });
});
