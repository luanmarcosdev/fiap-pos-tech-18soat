const { NotFoundError } = require('../../../shared/errors');
const { OrdemServico } = require('../domain/ordem-servico.entity');

const NOT_FOUND = 'Ordem de serviço não encontrada';

/** Comando "Inicia Diagnóstico" (mecânico): a OS passa para EM_DIAGNOSTICO e o cliente é notificado. */
class IniciarDiagnostico {
  #ordensServicoRepository;
  #notificarCliente;

  constructor({ ordensServicoRepository, notificarCliente }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#notificarCliente = notificarCliente;
  }

  async execute(id) {
    let diagnosticoIniciado;
    // linha travada (ver updateWithLock): dois mecânicos não iniciam o mesmo diagnóstico ao mesmo tempo
    const ordemServico = await this.#ordensServicoRepository.updateWithLock(id, (data) => {
      const os = new OrdemServico(data);
      diagnosticoIniciado = os.iniciarDiagnostico();
      return { status: os.status };
    });
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);

    // só depois do commit: o cliente não pode ser avisado de uma mudança que foi desfeita.
    // A policy não lança por falha do sistema externo, então a resposta reflete o que foi gravado
    await this.#notificarCliente.execute(diagnosticoIniciado);
    return ordemServico;
  }
}

module.exports = { IniciarDiagnostico };
