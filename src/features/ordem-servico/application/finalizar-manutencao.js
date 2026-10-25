
const { NotFoundError } = require('../../../shared/errors');
const { OrdemServico } = require('../domain/ordem-servico.entity');


const NOT_FOUND = 'Ordem de serviço não encontrada';

/** Policy "Finalizar Ordem de Serviço": com o status em_execucao, a OS é encerrada após a manutenção*/
class FinalizarManutencao {
  #ordensServicoRepository;

  constructor({ ordensServicoRepository }) {
    this.#ordensServicoRepository = ordensServicoRepository;
  }

  async execute(id) {
    // linha travada, como nos comandos do mecânico: não concorre com outra mudança de status da OS
    const ordemServico = await this.#ordensServicoRepository.updateWithLock(id, (data) => {
      const os = new OrdemServico(data);
      os.finalizarEmExecucao();
      return { status: os.status };
    });
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);
    return ordemServico;
  }
}

module.exports = { FinalizarManutencao };
