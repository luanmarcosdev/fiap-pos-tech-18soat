const { ConflictError } = require('../../../shared/errors');

/** "Status da OS Alterado para ..." do event storming. */
const STATUS = Object.freeze({
  RECEBIDA: 'RECEBIDA',
  EM_DIAGNOSTICO: 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO: 'AGUARDANDO_APROVACAO',
  EM_EXECUCAO: 'EM_EXECUCAO',
  FINALIZADA: 'FINALIZADA',
  ENTREGUE: 'ENTREGUE',
});

/**
 * Agregado Ordem de Serviço: cada comando do mecânico é um método que valida a transição de status
 * e devolve o evento ocorrido, para que o caso de uso dispare as policies.
 */
class OrdemServico {
  #id;
  #numero;
  #clienteId;
  #status;

  constructor({ id, numero, cliente_id, status }) {
    if (!Object.values(STATUS).includes(status)) throw new Error(`Status inválido para a ordem de serviço ${id}`);
    this.#id = id;
    this.#numero = numero;
    this.#clienteId = cliente_id;
    this.#status = status;
  }

  get status() {
    return this.#status;
  }

  /** Comando "Inicia Diagnóstico". */
  iniciarDiagnostico() {
    if (this.#status !== STATUS.RECEBIDA) {
      throw new ConflictError('Só é possível iniciar o diagnóstico de uma ordem de serviço recebida');
    }
    this.#status = STATUS.EM_DIAGNOSTICO;
    return this.#evento('DiagnosticoIniciado');
  }

  #evento(tipo) {
    return { tipo, ordemServicoId: this.#id, numero: this.#numero, clienteId: this.#clienteId };
  }
}

module.exports = { OrdemServico, STATUS };
