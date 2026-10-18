const { UnauthorizedError } = require('../../../shared/errors');

class AuthService {
  #usuariosRepository;
  #passwordHasher;
  #tokenService;

  constructor({ usuariosRepository, passwordHasher, tokenService }) {
    this.#usuariosRepository = usuariosRepository;
    this.#passwordHasher = passwordHasher;
    this.#tokenService = tokenService;
  }

  async login({ usuario, senha }) {
    const found = await this.#usuariosRepository.findByUsuario(usuario);
    await this.#ensureValidCredentials(found, senha);

    const { token, expiresAt } = this.#tokenService.sign({ sub: found.id, usuario: found.usuario });
    return { token, tipo: 'Bearer', expiraEm: expiresAt.toISOString() };
  }

  /** Mesma mensagem para usuário inexistente e senha errada, para não revelar quais usuários existem. */
  async #ensureValidCredentials(usuario, senha) {
    const valid = usuario !== null && (await this.#passwordHasher.compare(senha, usuario.senha_hash));
    if (!valid) throw new UnauthorizedError('Credenciais inválidas');
  }
}

module.exports = { AuthService };
