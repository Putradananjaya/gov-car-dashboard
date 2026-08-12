// Karakter ambigu (0/O, 1/l/I) sengaja dibuang supaya mudah dibaca & diketik ulang
// saat admin menyalin kata sandi sementara ke pengguna secara manual.
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

export function generateTemporaryPassword(length = 10): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, v => CHARSET[v % CHARSET.length]).join('');
}
