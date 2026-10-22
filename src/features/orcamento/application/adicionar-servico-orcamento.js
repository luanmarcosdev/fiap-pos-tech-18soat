const { UnprocessableError } = require('../../../shared/errors');
const { Orcamento } = require('../domain/orcamento.entity');

/**
 * Lado do orçamento do comando "Adiciona Serviço", que pertence à ordem de serviço (daí o nome não ser um post-it):
 * inclui o serviço no orçamento da OS. O rascunho é criado no primeiro item, já que os itens precisam dele para existir.
 */
class AdicionarServicoOrcamento {
  #orcamentosRepository;
  #getServicoById;

  /** getServicoById vem da interface pública do slice servicos. */
  constructor({ orcamentosRepository, getServicoById }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#getServicoById = getServicoById;
  }

  async execute(ordemServicoId, servicoId) {
    const servico = await this.#findServicoOrFail(servicoId);
    return this.#orcamentosRepository.addServico(ordemServicoId, (data) => {
      const orcamento = new Orcamento(data);
      const item = orcamento.adicionarServico(servico);
      return { servico: item, valor_total: orcamento.valorTotal };
    });
  }

  async #findServicoOrFail(servicoId) {
    const servico = await this.#getServicoById(servicoId);
    if (!servico) throw new UnprocessableError('Serviço não encontrado');
    return servico;
  }
}

module.exports = { AdicionarServicoOrcamento };
