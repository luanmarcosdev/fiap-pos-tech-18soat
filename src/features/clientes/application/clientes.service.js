const { ConflictError, NotFoundError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');
const { Documento } = require('../domain/documento.vo');

const NOT_FOUND = 'Cliente não encontrado';
const DUPLICATED = 'Já existe um cliente com este documento';

class ClientesService {
  #clientesRepository;
  #removalGuards;

  /**
   * removalGuards: funções `(clienteId) => motivo | null` registradas por outros slices
   * (ex.: veiculos) para impedir a remoção de um cliente ainda em uso, sem que clientes dependa deles.
   * A lista é compartilhada com o index.js, que continua registrando guards depois da criação.
   */
  constructor({ clientesRepository, removalGuards = [] }) {
    this.#clientesRepository = clientesRepository;
    this.#removalGuards = removalGuards;
  }

  async getById(id) {
    const cliente = await this.#clientesRepository.findById(id);
    if (!cliente) throw new NotFoundError(NOT_FOUND);
    return cliente;
  }

  async create(payload) {
    const data = this.#buildClienteData(payload);
    await this.#ensureDocumentoIsAvailable(data.documento);
    return this.#clientesRepository.create(data);
  }

  async list({ page, limit, nome, documento }) {
    const { rows, count } = await this.#clientesRepository.findAll({ page, limit, filtros: { nome, documento } });
    return paginate(rows, count, page, limit);
  }

  async update(id, payload) {
    await this.getById(id);
    const data = this.#buildClienteData(payload);
    await this.#ensureDocumentoIsAvailable(data.documento, id);
    return this.#clientesRepository.update(id, data);
  }

  async remove(id) {
    await this.getById(id);
    await this.#ensureNotInUse(id);
    const removed = await this.#clientesRepository.delete(id);
    if (!removed) throw new NotFoundError(NOT_FOUND);
  }

  /** Dados prontos para gravar: documento sem máscara e tipo_pessoa derivado dele (nunca vem do payload). */
  #buildClienteData(payload) {
    const documento = Documento.create(payload.documento);
    return { ...payload, documento: documento.valor, tipo_pessoa: documento.tipoPessoa };
  }

  /** O documento não pode pertencer a outro cliente. `clienteId` é o próprio cliente numa atualização. */
  async #ensureDocumentoIsAvailable(documento, clienteId = null) {
    const owner = await this.#clientesRepository.findByDocumento(documento);
    if (owner && owner.id !== clienteId) throw new ConflictError(DUPLICATED);
  }

  async #ensureNotInUse(clienteId) {
    for (const guard of this.#removalGuards) {
      const reason = await guard(clienteId);
      if (reason) throw new ConflictError(reason);
    }
  }
}

module.exports = { ClientesService };
