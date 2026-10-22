const { NotFoundError } = require('../../../shared/errors');
const { OrdemServico } = require('../domain/ordem-servico.entity');

const NOT_FOUND = 'Ordem de serviço não encontrada';

/**
 * Comando "Conclui Diagnóstico" (mecânico): gera e envia o orçamento (com a verificação de estoque), a OS passa a
 * AGUARDANDO_APROVACAO e o cliente recebe o orçamento numa única notificação.
 */
class ConcluirDiagnostico {
  #ordensServicoRepository;
  #gerarOrcamento;
  #notificarCliente;

  /** gerarOrcamento vem da interface pública do slice orcamento. */
  constructor({ ordensServicoRepository, gerarOrcamento, notificarCliente }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#gerarOrcamento = gerarOrcamento;
    this.#notificarCliente = notificarCliente;
  }

  /**
   * O orçamento é gerado antes de a OS mudar: a partir daí ele recusa novos itens, então nada entra depois.
   * Gerar é idempotente, então se a OS falhar depois do orçamento, repetir a conclusão termina o trabalho.
   */
  async execute(id, { diagnostico }) {
    await this.#ensurePodeConcluir(id, diagnostico);
    const orcamento = await this.#gerarOrcamento(id);

    let diagnosticoConcluido;
    const ordemServico = await this.#ordensServicoRepository.updateWithLock(id, (data) => {
      const os = new OrdemServico(data);
      diagnosticoConcluido = os.concluirDiagnostico(diagnostico);
      return { status: os.status, diagnostico: os.diagnostico };
    });
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);

    // "Notificar Cliente" (aguardando aprovação) e "Enviar Orçamento" numa mensagem só
    await this.#notificarCliente.execute({ ...diagnosticoConcluido, orcamento });
    return { ordem_servico: ordemServico, orcamento };
  }

  /** Confere a OS antes de gerar o orçamento, para não enviar orçamento de uma OS que não está em diagnóstico. */
  async #ensurePodeConcluir(id, diagnostico) {
    const ordemServico = await this.#ordensServicoRepository.findById(id);
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);
    new OrdemServico(ordemServico).concluirDiagnostico(diagnostico);
  }
}

module.exports = { ConcluirDiagnostico };
