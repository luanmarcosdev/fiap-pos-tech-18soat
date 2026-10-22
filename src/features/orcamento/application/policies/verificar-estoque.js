const { NotFoundError } = require('../../../../shared/errors');

/**
 * Policy "Verificar Estoque": para cada peça/insumo do orçamento, informa se o estoque disponível cobre a quantidade.
 * Disponível = estoque menos o reservado por outros orçamentos enviados. Só informa: se faltar, a compra acontece
 * depois da aprovação (fora deste fluxo).
 */
class VerificarEstoque {
  #orcamentosRepository;
  #getPecaById;

  /** getPecaById vem da interface pública do slice pecas. */
  constructor({ orcamentosRepository, getPecaById }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#getPecaById = getPecaById;
  }

  async execute(orcamento) {
    const reservas = await this.#orcamentosRepository.sumReservasByPeca(
      orcamento.pecas.map(({ peca_id }) => peca_id),
      orcamento.id,
    );
    const catalogo = await Promise.all(orcamento.pecas.map(({ peca_id }) => this.#findPeca(peca_id)));
    const pecas = orcamento.pecas.map((item, i) => {
      const peca = catalogo[i];
      const disponivel = peca ? peca.quantidade_estoque - (reservas[item.peca_id] ?? 0) : 0;
      return { ...item, em_estoque: disponivel >= item.quantidade };
    });
    return { ...orcamento, pecas };
  }

  /** Peça removida do catálogo depois de entrar no orçamento conta como fora de estoque. */
  async #findPeca(pecaId) {
    try {
      return await this.#getPecaById(pecaId);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
}

module.exports = { VerificarEstoque };
