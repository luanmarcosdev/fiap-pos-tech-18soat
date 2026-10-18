const { NotFoundError, ConflictError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');
const { Peca } = require('../domain/peca.entity');

const NOT_FOUND = 'Peça não encontrada';
const DUPLICATED = 'Já existe uma peça com este código';

class PecasService {
  #pecasRepository;

  constructor({ pecasRepository }) {
    this.#pecasRepository = pecasRepository;
  }

  async getById(id) {
    const peca = await this.#findOrFail(id);
    return this.#toView(peca);
  }

  async create(payload) {
    await this.#ensureCodigoIsAvailable(payload.codigo);
    const peca = await this.#pecasRepository.create(payload);
    return this.#toView(peca);
  }

  async list({ page, limit, ...filtros }) {
    const { rows, count } = await this.#pecasRepository.findAll({ page, limit, filtros });
    const pecas = rows.map((peca) => this.#toView(peca));
    return paginate(pecas, count, page, limit);
  }

  /** Dados cadastrais e preço; o estoque só muda pelas operações de estoque abaixo. */
  async update(id, payload) {
    await this.#findOrFail(id);
    await this.#ensureCodigoIsAvailable(payload.codigo, id);
    const peca = await this.#pecasRepository.update(id, payload);
    return this.#toView(peca);
  }

  async remove(id) {
    const removed = await this.#pecasRepository.delete(id);
    if (!removed) throw new NotFoundError(NOT_FOUND);
  }

  async verificarEstoque(id, quantidade) {
    const peca = new Peca(await this.#findOrFail(id));
    return peca.temEstoque(quantidade);
  }

  /** Evento "Peça/Insumo Adquirido". */
  async registrarEntrada(id, quantidade) {
    return this.#alterarEstoque(id, (peca) => peca.registrarEntrada(quantidade));
  }

  /** Lança ConflictError se não houver quantidade suficiente. */
  async baixarEstoque(id, quantidade) {
    return this.#alterarEstoque(id, (peca) => peca.baixarEstoque(quantidade));
  }

  async #findOrFail(id) {
    const peca = await this.#pecasRepository.findById(id);
    if (!peca) throw new NotFoundError(NOT_FOUND);
    return peca;
  }

  /** O código não pode pertencer a outra peça. `pecaId` é a própria peça numa atualização. */
  async #ensureCodigoIsAvailable(codigo, pecaId = null) {
    const owner = await this.#pecasRepository.findByCodigo(codigo);
    if (owner && owner.id !== pecaId) throw new ConflictError(DUPLICATED);
  }

  /**
   * Aplica uma operação da entidade sobre a peça com a linha travada no banco (ver updateStock),
   * para que duas operações simultâneas não leiam o mesmo estoque.
   */
  async #alterarEstoque(id, operation) {
    const updated = await this.#pecasRepository.updateStock(id, (data) => {
      const peca = new Peca(data);
      operation(peca);
      return { quantidade_estoque: peca.quantidadeEstoque };
    });
    if (!updated) throw new NotFoundError(NOT_FOUND);
    return this.#toView(updated);
  }

  /** Dados da peça mais o campo calculado pela entidade. */
  #toView(data) {
    const peca = new Peca(data);
    return { ...data, abaixo_minimo: peca.abaixoDoMinimo };
  }
}

module.exports = { PecasService };
