const { NotFoundError, UnprocessableError } = require('../../../shared/errors');
const { Orcamento } = require('../domain/orcamento.entity');

/**
 * Lado do orçamento do comando "Adiciona Peças/Insumos", que pertence à ordem de serviço:
 * inclui a peça/insumo no orçamento da OS, criando o rascunho no primeiro item.
 */
class AdicionarPecaOrcamento {
  #orcamentosRepository;
  #getPecaById;

  /** getPecaById vem da interface pública do slice pecas. */
  constructor({ orcamentosRepository, getPecaById }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#getPecaById = getPecaById;
  }

  async execute(ordemServicoId, pecaId, quantidade) {
    const peca = await this.#findPecaOrFail(pecaId);
    return this.#orcamentosRepository.addPeca(ordemServicoId, (data) => {
      const orcamento = new Orcamento(data);
      const item = orcamento.adicionarPeca(peca, quantidade);
      return { item, valor_total: orcamento.valorTotal };
    });
  }

  /** getPecaById lança NotFoundError; aqui a peça vem no corpo da requisição, então é 422, como no serviço. */
  async #findPecaOrFail(pecaId) {
    try {
      return await this.#getPecaById(pecaId);
    } catch (error) {
      if (error instanceof NotFoundError) throw new UnprocessableError('Peça/insumo não encontrado');
      throw error;
    }
  }
}

module.exports = { AdicionarPecaOrcamento };
