const { UnprocessableError } = require('../../../../shared/errors');
const { Orcamento, SEM_ITENS } = require('../../domain/orcamento.entity');

/**
 * Policies "Gerar Orçamento" e "Enviar Orçamento", que reagem ao "Diagnóstico Concluído" da ordem de serviço:
 * o rascunho vira o orçamento enviado ao cliente, com a verificação de estoque de cada peça/insumo.
 */
class GerarOrcamento {
  #orcamentosRepository;
  #verificarEstoque;
  #agora;

  constructor({ orcamentosRepository, verificarEstoque, agora = () => new Date() }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#verificarEstoque = verificarEstoque;
    this.#agora = agora;
  }

  async execute(ordemServicoId) {
    const orcamento = await this.#orcamentosRepository.updateWithLock(ordemServicoId, (data) => {
      const rascunho = new Orcamento(data);
      rascunho.gerar(this.#agora());
      return { status: rascunho.status, expira_em: rascunho.expiraEm };
    });
    // sem orçamento = nenhum item foi adicionado durante o diagnóstico
    if (!orcamento) throw new UnprocessableError(SEM_ITENS);

    // a verificação só informa, então roda depois de gravar, fora da transação: não alonga o lock do orçamento
    return this.#verificarEstoque.execute(orcamento);
  }
}

module.exports = { GerarOrcamento };
