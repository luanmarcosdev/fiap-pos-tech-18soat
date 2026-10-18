const { UnauthorizedError } = require('../../../shared/errors');

function createAuthenticateMiddleware({ tokenService }) {
  return function authenticate(req, res, next) {
    const [scheme, token] = (req.get('authorization') || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(new UnauthorizedError('Token não informado'));
    }

    try {
      const { sub, usuario } = tokenService.verify(token);
      req.usuario = { id: sub, usuario };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { createAuthenticateMiddleware };
