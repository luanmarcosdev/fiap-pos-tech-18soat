const { NotFoundError } = require('../../../../shared/errors');
const { OrdemServico } = require('../../domain/ordem-servico.entity');

const NOT_FOUND = 'Ordem de serviço não encontrada';

/** Policy "Finalizar Ordem de Serviço": com o orçamento reprovado, a OS é encerrada sem manutenção. */
class FinalizarOrdemServico {
  #ordensServicoRepository;

  constructor({ ordensServicoRepository }) {
    this.#ordensServicoRepository = ordensServicoRepository;
  }

  async execute(id) {
    // linha travada, como nos comandos do mecânico: não concorre com outra mudança de status da OS
    const ordemServico = await this.#ordensServicoRepository.updateWithLock(id, (data) => {
      const os = new OrdemServico(data);
      os.finalizarSemExecucao();
      return { status: os.status };
    });
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);
    return ordemServico;
  }
}

module.exports = { FinalizarOrdemServico };
