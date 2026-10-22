const { NotFoundError } = require('../../../shared/errors');
const { OrdemServico } = require('../domain/ordem-servico.entity');

const NOT_FOUND = 'Ordem de serviço não encontrada';

/** Comando "Adiciona Serviço" (mecânico): o serviço entra no orçamento da OS, que está em diagnóstico. */
class AdicionarServico {
  #ordensServicoRepository;
  #adicionarServicoOrcamento;

  /** adicionarServicoOrcamento vem da interface pública do slice orcamento. */
  constructor({ ordensServicoRepository, adicionarServicoOrcamento }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#adicionarServicoOrcamento = adicionarServicoOrcamento;
  }

  /**
   * A OS não é travada: quem serializa os itens é o orçamento (linha travada ao incluir). Como o "Conclui
   * Diagnóstico" gera o orçamento antes de mudar a OS, um item que chegue depois recebe "orçamento já gerado".
   */
  async execute(id, servicoId) {
    const ordemServico = await this.#ordensServicoRepository.findById(id);
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);
    new OrdemServico(ordemServico).adicionarServico();
    return this.#adicionarServicoOrcamento(id, servicoId);
  }
}

module.exports = { AdicionarServico };
