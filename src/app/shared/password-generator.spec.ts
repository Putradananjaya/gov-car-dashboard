import { generateTemporaryPassword } from './password-generator';

describe('generateTemporaryPassword', () => {
  it('defaults to 10 characters', () => {
    expect(generateTemporaryPassword().length).toBe(10);
  });

  it('respects a custom length', () => {
    expect(generateTemporaryPassword(16).length).toBe(16);
  });

  it('only uses unambiguous characters', () => {
    const password = generateTemporaryPassword(200);
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it('produces different passwords across calls', () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).not.toBe(b);
  });
});
