const bcrypt = require('bcryptjs');
const passwordHasher = require('@src/features/auth/infra/password-hasher');

describe('passwordHasher.compare', () => {
  const hash = bcrypt.hashSync('admin', 4);

  it('aceita a senha correta', async () => {
    await expect(passwordHasher.compare('admin', hash)).resolves.toBe(true);
  });

  it('rejeita a senha errada', async () => {
    await expect(passwordHasher.compare('errada', hash)).resolves.toBe(false);
  });
});
