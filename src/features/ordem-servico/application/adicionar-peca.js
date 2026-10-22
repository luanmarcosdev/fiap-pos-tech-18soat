const { NotFoundError } = require('../../../shared/errors');
const { OrdemServico } = require('../domain/ordem-servico.entity');

const NOT_FOUND = 'Ordem de serviço não encontrada';

/** Comando "Adiciona Peças/Insumos" (mecânico): a peça/insumo entra no orçamento da OS, que está em diagnóstico. */
class AdicionarPeca {
  #ordensServicoRepository;
  #adicionarPecaOrcamento;

  /** adicionarPecaOrcamento vem da interface pública do slice orcamento. */
  constructor({ ordensServicoRepository, adicionarPecaOrcamento }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#adicionarPecaOrcamento = adicionarPecaOrcamento;
  }

  /** A OS não é travada pelo mesmo motivo do AdicionarServico: quem serializa os itens é o orçamento. */
  async execute(id, { peca_id, quantidade }) {
    const ordemServico = await this.#ordensServicoRepository.findById(id);
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);
    new OrdemServico(ordemServico).adicionarPeca();
    return this.#adicionarPecaOrcamento(id, peca_id, quantidade);
  }
}

module.exports = { AdicionarPeca };
