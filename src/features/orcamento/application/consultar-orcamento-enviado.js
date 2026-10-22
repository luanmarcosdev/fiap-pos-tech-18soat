const { Orcamento } = require('../domain/orcamento.entity');

/** Orçamento que o cliente pode ver na consulta da OS: o rascunho do diagnóstico fica de fora. */
class ConsultarOrcamentoEnviado {
  #orcamentosRepository;

  constructor({ orcamentosRepository }) {
    this.#orcamentosRepository = orcamentosRepository;
  }

  async execute(ordemServicoId) {
    const orcamento = await this.#orcamentosRepository.findByOrdemServico(ordemServicoId);
    if (!orcamento || !new Orcamento(orcamento).enviado) return null;
    return orcamento;
  }
}

module.exports = { ConsultarOrcamentoEnviado };
