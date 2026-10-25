const { ConflictError, ValidationError } = require('../../../shared/errors');

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
  #diagnostico;

  /**
   * Comando "Cria Ordem de Serviço" (atendente): a OS nasce RECEBIDA com a queixa do cliente.
   * Devolve os dados a gravar, porque o id e o número só existem depois de a OS ser gravada.
   */
  static criar({ cliente_id, veiculo_id, queixa }) {
    if (typeof queixa !== 'string' || queixa.trim() === '') {
      throw new ValidationError('Queixa inválida', [{ campo: 'queixa', mensagem: 'Informe a queixa do cliente' }]);
    }
    return { cliente_id, veiculo_id, queixa: queixa.trim(), status: STATUS.RECEBIDA };
  }

  constructor({ id, numero, cliente_id, status, diagnostico = null }) {
    if (!Object.values(STATUS).includes(status)) throw new Error(`Status inválido para a ordem de serviço ${id}`);
    this.#id = id;
    this.#numero = numero;
    this.#clienteId = cliente_id;
    this.#status = status;
    this.#diagnostico = diagnostico;
  }

  get status() {
    return this.#status;
  }

  get diagnostico() {
    return this.#diagnostico;
  }

  /** Diagnóstico concluído = o orçamento já foi enviado ao cliente (lista fechada: status novo não entra sem querer). */
  get diagnosticoConcluido() {
    return [STATUS.AGUARDANDO_APROVACAO, STATUS.EM_EXECUCAO, STATUS.FINALIZADA, STATUS.ENTREGUE].includes(this.#status);
  }

  /** Evento "Ordem de Serviço Criada", tirado da OS já gravada (com id e número). */
  criada() {
    if (this.#status !== STATUS.RECEBIDA) throw new Error(`A ordem de serviço ${this.#id} não está recebida`);
    return this.#evento('OrdemServicoCriada');
  }

  /** Comando "Inicia Diagnóstico". */
  iniciarDiagnostico() {
    if (this.#status !== STATUS.RECEBIDA) {
      throw new ConflictError('Só é possível iniciar o diagnóstico de uma ordem de serviço recebida');
    }
    this.#status = STATUS.EM_DIAGNOSTICO;
    return this.#evento('DiagnosticoIniciado');
  }

  /** Comando "Inicia Manutenção". */
  iniciarManutencao() {
    if (this.#status !== STATUS.AGUARDANDO_APROVACAO) {
      throw new ConflictError('Só é possível iniciar o manutenção de uma ordem de serviço aguardando aprovação');
    }
    this.#status = STATUS.EM_EXECUCAO;
    return this.#evento('ManutencaoIniciada');
  }

    /** Comando "Finaliza Manutenção". */
  finalizarManutencao() {
    if (this.#status === STATUS.ENTREGUE) {
      throw new ConflictError('Não é possível finalizar uma ordem de serviço já entregue');
    }

    this.#status = STATUS.FINALIZADA;
    return this.#evento('ManutencaoFinalizada');
  }

  /** Comando "Confirmar Pagamento": o status não muda. mas só vale depois da manutenção. */
  confirmarPagamento() {
    
    if (this.#status !== STATUS.FINALIZADA) {
      throw new ConflictError('Não é possível realizar o pagamento de uma OS sem manutenção finalizada');
    }

    return this.#evento('PagamentoConfirmado');
  }

  /** Comando "Adiciona Serviço": o status não muda, mas só vale durante o diagnóstico. */
  adicionarServico() {
    this.#ensureEmDiagnostico('Só é possível adicionar serviços durante o diagnóstico');
    return this.#evento('ServicoAdicionado');
  }

  /** Comando "Adiciona Peças/Insumos": como o de serviço, só vale durante o diagnóstico. */
  adicionarPeca() {
    this.#ensureEmDiagnostico('Só é possível adicionar peças e insumos durante o diagnóstico');
    return this.#evento('PecasInsumosAdicionados');
  }

  /**
   * Comando "Conclui Diagnóstico": registra o diagnóstico do mecânico e a OS passa a aguardar a aprovação do
   * cliente, que recebe o orçamento gerado na mesma operação.
   */
  concluirDiagnostico(diagnostico) {
    this.#ensureEmDiagnostico('Só é possível concluir o diagnóstico de uma ordem de serviço em diagnóstico');
    if (typeof diagnostico !== 'string' || diagnostico.trim() === '') {
      throw new ValidationError('Diagnóstico inválido', [{ campo: 'diagnostico', mensagem: 'Informe o diagnóstico' }]);
    }
    this.#diagnostico = diagnostico.trim();
    this.#status = STATUS.AGUARDANDO_APROVACAO;
    return this.#evento('DiagnosticoConcluido');
  }

  /**
   * Policy "Finalizar Ordem de Serviço", que reage ao "Orçamento Reprovado": a OS é encerrada sem manutenção.
   * Já finalizada, não faz nada (devolve null): repetir a reprovação depois de uma falha termina o trabalho.
   */
  finalizarSemExecucao() {
    if (this.#status === STATUS.FINALIZADA) return null;
    if (this.#status !== STATUS.AGUARDANDO_APROVACAO) {
      throw new ConflictError('Só é possível finalizar sem execução uma ordem de serviço aguardando aprovação');
    }
    this.#status = STATUS.FINALIZADA;
    return this.#evento('OrdemServicoFinalizada');
  }

  /**
   * Policy "Finalizar Ordem de Serviço", que reage a "Manutenção Finalizada".
   */
  finalizarEmExecucao() {
    if (this.#status === STATUS.FINALIZADA) return null;
    if (this.#status !== STATUS.EM_EXECUCAO) {
      throw new ConflictError('Só é possível finalizar uma manutenção que está em execução');
    }
    this.#status = STATUS.FINALIZADA;
    return this.#evento('OrdemServicoFinalizada');
  }

  entregarVeiculo() {
    if (this.#status !== STATUS.FINALIZADA) {
      throw new ConflictError('Só é possível entregar um veículo de uma ordem de serviço com manutenção finalizada');
    }
    this.#status = STATUS.ENTREGUE;
    return this.#evento('VeiculoEntregue');
  }


  #ensureEmDiagnostico(mensagem) {
    if (this.#status !== STATUS.EM_DIAGNOSTICO) throw new ConflictError(mensagem);
  }

  #evento(tipo) {
    return { tipo, ordemServicoId: this.#id, numero: this.#numero, clienteId: this.#clienteId };
  }
}

module.exports = { OrdemServico, STATUS };
