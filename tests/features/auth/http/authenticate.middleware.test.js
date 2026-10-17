const jwt = require('jsonwebtoken');
const { makeAuthenticate } = require('@src/features/auth/http/authenticate.middleware');
const tokenService = require('@src/features/auth/infra/token.service');
const { UnauthorizedError } = require('@src/shared/errors');

const authenticate = makeAuthenticate({ tokenService });

const run = (authorization) => {
  const req = { get: jest.fn().mockReturnValue(authorization) };
  const next = jest.fn();
  authenticate(req, {}, next);
  return { req, next };
};

describe('authenticate', () => {
  it('preenche req.usuario com um token válido', () => {
    const { token } = tokenService.sign({ sub: 'id-1', usuario: 'admin' });

    const { req, next } = run(`Bearer ${token}`);

    expect(next).toHaveBeenCalledWith();
    expect(req.usuario).toEqual({ id: 'id-1', usuario: 'admin' });
  });

  it.each([
    ['sem header', undefined],
    ['sem token', 'Bearer'],
    ['com outro esquema', 'Basic abc'],
  ])('responde 401 %s', (_, header) => {
    const { next } = run(header);

    expect(next).toHaveBeenCalledWith(new UnauthorizedError('Token não informado'));
  });

  it('responde 401 com token inválido', () => {
    const { next } = run('Bearer invalido');

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('responde 401 com token expirado', () => {
    const expired = jwt.sign({ usuario: 'admin', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);

    const { next } = run(`Bearer ${expired}`);

    expect(next).toHaveBeenCalledWith(new UnauthorizedError('Token inválido ou expirado'));
  });
});
