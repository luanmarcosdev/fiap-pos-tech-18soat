const { ConflictError } = require('../../../shared/errors');

const STATUS = Object.freeze({
  EM_DIAGNOSTICO: 'EM_DIAGNOSTICO',
  ENVIADO: 'ENVIADO',
  APROVADO: 'APROVADO',
  REPROVADO: 'REPROVADO',
  EXPIRADO: 'EXPIRADO',
});

// soma em centavos para não sofrer com ponto flutuante (ex.: 0.1 + 0.2)
const toCentavos = (valor) => Math.round(valor * 100);

/**
 * Orçamento da OS. Durante o diagnóstico é um rascunho (EM_DIAGNOSTICO) que recebe os serviços e peças/insumos
 * escolhidos pelo mecânico; ao concluir o diagnóstico é gerado e enviado ao cliente.
 */
class Orcamento {
  #status;
  #servicos;

  constructor({ id, status, servicos = [] }) {
    if (!Object.values(STATUS).includes(status)) throw new Error(`Status inválido para o orçamento ${id}`);
    this.#status = status;
    this.#servicos = [...servicos];
  }

  get valorTotal() {
    const centavos = this.#servicos.reduce((total, { valor_unitario }) => total + toCentavos(valor_unitario), 0);
    return centavos / 100;
  }

  /** Copia o preço de tabela: mudar o catálogo depois não altera o orçamento. */
  adicionarServico({ id, preco }) {
    this.#ensureEmDiagnostico();
    if (this.#servicos.some(({ servico_id }) => servico_id === id)) {
      throw new ConflictError('Serviço já adicionado ao orçamento');
    }
    const item = { servico_id: id, valor_unitario: preco };
    this.#servicos.push(item);
    return item;
  }

  #ensureEmDiagnostico() {
    if (this.#status !== STATUS.EM_DIAGNOSTICO) {
      throw new ConflictError('O orçamento já foi gerado e não aceita novos itens');
    }
  }
}

module.exports = { Orcamento, STATUS };
