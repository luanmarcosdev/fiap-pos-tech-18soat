const usuariosRepository = require('./infra/usuarios.repository');
const passwordHasher = require('./infra/password-hasher');
const tokenService = require('./infra/token.service');
const { AuthService } = require('./application/auth.service');
const { AuthController } = require('./http/auth.controller');
const { createAuthRouter } = require('./http/auth.routes');
const { createAuthenticateMiddleware } = require('./http/authenticate.middleware');

const authService = new AuthService({ usuariosRepository, passwordHasher, tokenService });
const authController = new AuthController({ authService });

module.exports = {
  routes: createAuthRouter({ authController }),
  authenticate: createAuthenticateMiddleware({ tokenService }),
  // exposto para os testes de integração dos outros slices gerarem tokens válidos
  signToken: tokenService.sign,
};
