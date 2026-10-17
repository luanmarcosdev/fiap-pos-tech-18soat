const jwt = require('jsonwebtoken');
const tokenService = require('@src/features/auth/infra/token.service');
const { UnauthorizedError } = require('@src/shared/errors');

describe('tokenService', () => {
  it('assina e verifica um token', () => {
    const { token, expiresAt } = tokenService.sign({ sub: 'id-1', usuario: 'admin' });

    expect(tokenService.verify(token)).toEqual({ sub: 'id-1', usuario: 'admin' });
    // JWT_EXPIRES_IN=1h no jest.setup.js
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000);
  });

  it('rejeita token assinado com outro segredo', () => {
    const token = jwt.sign({ usuario: 'admin' }, 'outro-segredo', { subject: 'id-1' });

    expect(() => tokenService.verify(token)).toThrow(UnauthorizedError);
  });

  it('rejeita token expirado', () => {
    const token = jwt.sign({ usuario: 'admin', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);

    expect(() => tokenService.verify(token)).toThrow('Token inválido ou expirado');
  });
});
