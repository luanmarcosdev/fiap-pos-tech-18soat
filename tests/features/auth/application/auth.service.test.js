const { AuthService } = require('@src/features/auth/application/auth.service');
const { UnauthorizedError } = require('@src/shared/errors');

const admin = { id: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin', senha_hash: 'hash' };
const expiresAt = new Date('2026-10-18T00:00:00.000Z');

const setup = ({ found = admin, passwordOk = true } = {}) => {
  const usuariosRepository = { findByUsuario: jest.fn().mockResolvedValue(found) };
  const passwordHasher = { compare: jest.fn().mockResolvedValue(passwordOk) };
  const tokenService = { sign: jest.fn().mockReturnValue({ token: 'jwt', expiresAt }) };
  const service = new AuthService({ usuariosRepository, passwordHasher, tokenService });
  return { service, usuariosRepository, passwordHasher, tokenService };
};

describe('authService.login', () => {
  it('devolve o token quando as credenciais são válidas', async () => {
    const { service, passwordHasher, tokenService } = setup();

    const result = await service.login({ usuario: 'admin', senha: 'admin' });

    expect(passwordHasher.compare).toHaveBeenCalledWith('admin', 'hash');
    expect(tokenService.sign).toHaveBeenCalledWith({ sub: admin.id, usuario: 'admin' });
    expect(result).toEqual({ token: 'jwt', tipo: 'Bearer', expiraEm: '2026-10-18T00:00:00.000Z' });
  });

  it('gera UnauthorizedError quando o usuário não existe', async () => {
    const { service, passwordHasher } = setup({ found: null });

    await expect(service.login({ usuario: 'x', senha: 'y' })).rejects.toThrow(
      new UnauthorizedError('Credenciais inválidas'),
    );
    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('gera UnauthorizedError com a mesma mensagem quando a senha está errada', async () => {
    const { service, tokenService } = setup({ passwordOk: false });

    await expect(service.login({ usuario: 'admin', senha: 'errada' })).rejects.toThrow(
      new UnauthorizedError('Credenciais inválidas'),
    );
    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
