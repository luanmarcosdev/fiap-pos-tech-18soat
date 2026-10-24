const { NotFoundError } = require('../../../shared/errors');
const { Orcamento } = require('../domain/orcamento.entity');

const NOT_FOUND = 'Orçamento não encontrado';

/**
 * Comando "Reprova Orçamento" (cliente, registrado pelo atendente): o orçamento passa a REPROVADO e a policy
 * "Finalizar Ordem de Serviço" encerra a OS. A reserva das peças/insumos cai sozinha, porque só os orçamentos
 * enviados reservam estoque.
 */
class ReprovarOrcamento {
  #orcamentosRepository;
  #finalizarOrdemServico;
  #agora;

  /** finalizarOrdemServico vem da interface pública do slice ordem-servico. */
  constructor({ orcamentosRepository, finalizarOrdemServico, agora = () => new Date() }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#finalizarOrdemServico = finalizarOrdemServico;
    this.#agora = agora;
  }

  /** Reprovar é idempotente, então se a OS falhar depois do orçamento, repetir a reprovação termina o trabalho. */
  async execute(id) {
    const orcamento = await this.#orcamentosRepository.updateWithLockById(id, (data) => {
      const reprovado = new Orcamento(data);
      reprovado.reprovar(this.#agora());
      return { status: reprovado.status };
    });
    if (!orcamento) throw new NotFoundError(NOT_FOUND);

    const ordemServico = await this.#finalizarOrdemServico(orcamento.ordem_servico_id);
    return { orcamento, ordem_servico: ordemServico };
  }
}

module.exports = { ReprovarOrcamento };
