const { ConflictError, NotFoundError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');

const NOT_FOUND = 'Serviço não encontrado';
const DUPLICATED = 'Já existe um serviço com este nome';

class ServicosService {
  #servicosRepository;

  constructor({ servicosRepository }) {
    this.#servicosRepository = servicosRepository;
  }

  async getById(id) {
    const servico = await this.#servicosRepository.findById(id);
    if (!servico) throw new NotFoundError(NOT_FOUND);
    return servico;
  }

  async create(payload) {
    await this.#ensureNomeIsAvailable(payload.nome);
    return this.#servicosRepository.create(payload);
  }

  async list({ page, limit, nome }) {
    const { rows, count } = await this.#servicosRepository.findAll({ page, limit, filtros: { nome } });
    return paginate(rows, count, page, limit);
  }

  async update(id, payload) {
    await this.getById(id);
    await this.#ensureNomeIsAvailable(payload.nome, id);
    return this.#servicosRepository.update(id, payload);
  }

  async remove(id) {
    const removed = await this.#servicosRepository.delete(id);
    if (!removed) throw new NotFoundError(NOT_FOUND);
  }

  /**
   * O nome não pode pertencer a outro serviço (sem diferenciar maiúsculas nem acentos).
   * `servicoId` é o próprio serviço numa atualização.
   */
  async #ensureNomeIsAvailable(nome, servicoId = null) {
    const owner = await this.#servicosRepository.findByNome(nome);
    if (owner && owner.id !== servicoId) throw new ConflictError(DUPLICATED);
  }
}

module.exports = { ServicosService };
