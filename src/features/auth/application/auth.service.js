const { UnauthorizedError } = require('../../../shared/errors');

function makeAuthService({ usuariosRepository, passwordHasher, tokenService }) {
  return {
    async login({ usuario, senha }) {
      const found = await usuariosRepository.findByUsuario(usuario);
      const valid = found !== null && (await passwordHasher.compare(senha, found.senha_hash));

      // mesma mensagem para usuário inexistente e senha errada, para não revelar quais usuários existem
      if (!valid) throw new UnauthorizedError('Credenciais inválidas');

      const { token, expiresAt } = tokenService.sign({ sub: found.id, usuario: found.usuario });
      return { token, tipo: 'Bearer', expiraEm: expiresAt.toISOString() };
    },
  };
}

module.exports = { makeAuthService };
