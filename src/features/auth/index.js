const usuariosRepository = require('./infra/usuarios.repository');
const passwordHasher = require('./infra/password-hasher');
const tokenService = require('./infra/token.service');
const { makeAuthService } = require('./application/auth.service');
const { makeAuthController } = require('./http/auth.controller');
const { makeAuthRoutes } = require('./http/auth.routes');
const { makeAuthenticate } = require('./http/authenticate.middleware');

const authService = makeAuthService({ usuariosRepository, passwordHasher, tokenService });
const authController = makeAuthController({ authService });

module.exports = {
  routes: makeAuthRoutes({ authController }),
  authenticate: makeAuthenticate({ tokenService }),
  // exposto para os testes de integração dos outros slices gerarem tokens válidos
  signToken: tokenService.sign,
};
