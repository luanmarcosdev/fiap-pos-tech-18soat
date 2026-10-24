const { ConflictError, NotFoundError } = require('../../../../shared/errors');

/**
 * Policy "Baixar Estoque", que reage ao "Orçamento Aprovado": cada peça/insumo do orçamento sai do estoque.
 * A falta de estoque não desfaz a aprovação: a peça fica marcada como a adquirir e a compra é pedida ao
 * sistema externo. Uma peça removida do catálogo depois de entrar no orçamento também precisa ser adquirida.
 */
class BaixarEstoque {
  #orcamentosRepository;
  #baixarEstoquePeca;
  #compras;

  /** baixarEstoquePeca vem da interface pública do slice pecas; compras é o sistema externo. */
  constructor({ orcamentosRepository, baixarEstoquePeca, compras }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#baixarEstoquePeca = baixarEstoquePeca;
    this.#compras = compras;
  }

  /** Cada baixa trava só a linha da peça, então as peças (sempre distintas no orçamento) rodam em paralelo. */
  async execute(orcamento) {
    const pendentes = orcamento.pecas.filter(({ estoque_baixado }) => estoque_baixado == null);
    const baixadas = new Map(await Promise.all(pendentes.map(async (item) => [item.id, await this.#baixar(item)])));
    const pecas = orcamento.pecas.map((item) =>
      baixadas.has(item.id) ? { ...item, estoque_baixado: baixadas.get(item.id) } : item,
    );

    // só as que ficaram sem estoque agora: numa retomada, as de antes já foram pedidas
    const aAdquirir = pecas.filter(({ id, estoque_baixado }) => baixadas.has(id) && !estoque_baixado);
    if (aAdquirir.length > 0) await this.#solicitarCompra(orcamento.id, aAdquirir);
    return { ...orcamento, pecas };
  }

  /** O resultado é gravado por item: repetir a aprovação não baixa de novo o que já saiu do estoque. */
  async #baixar({ id, peca_id, quantidade }) {
    let estoqueBaixado = true;
    try {
      await this.#baixarEstoquePeca(peca_id, quantidade);
    } catch (error) {
      if (!(error instanceof ConflictError || error instanceof NotFoundError)) throw error;
      estoqueBaixado = false;
    }
    await this.#orcamentosRepository.marcarEstoqueBaixado(id, estoqueBaixado);
    return estoqueBaixado;
  }

  /** Como a notificação ao cliente, o pedido é efeito colateral da aprovação já gravada: falha só é registrada. */
  async #solicitarCompra(orcamentoId, pecas) {
    try {
      await this.#compras.solicitar({ orcamentoId, pecas });
    } catch (error) {
      console.error(`Falha ao solicitar a compra das peças do orçamento ${orcamentoId}:`, error);
    }
  }
}

module.exports = { BaixarEstoque };
