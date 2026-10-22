const { ConflictError, UnprocessableError, ValidationError } = require('../../../shared/errors');

const STATUS = Object.freeze({
  EM_DIAGNOSTICO: 'EM_DIAGNOSTICO',
  ENVIADO: 'ENVIADO',
  APROVADO: 'APROVADO',
  REPROVADO: 'REPROVADO',
  EXPIRADO: 'EXPIRADO',
});

// soma em centavos para não sofrer com ponto flutuante (ex.: 0.1 + 0.2)
const toCentavos = (valor) => Math.round(valor * 100);

const VALOR_TOTAL_MAXIMO = 99999999.99; // DECIMAL(10,2) de orcamentos.valor_total

const SEM_ITENS = 'Adicione ao menos um serviço ou peça/insumo antes de concluir o diagnóstico';

const VALIDADE_EM_DIAS = 14;
const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

function validarQuantidade(quantidade) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new ValidationError('Quantidade inválida', [
      { campo: 'quantidade', mensagem: 'Deve ser um número inteiro maior que zero' },
    ]);
  }
}

/**
 * Orçamento da OS. Durante o diagnóstico é um rascunho (EM_DIAGNOSTICO) que recebe os serviços e peças/insumos
 * escolhidos pelo mecânico; ao concluir o diagnóstico é gerado e enviado ao cliente.
 * Os itens guardam uma cópia do preço do catálogo: mudar o catálogo depois não altera o orçamento.
 */
class Orcamento {
  #status;
  #expiraEm;
  #servicos;
  #pecas;

  constructor({ id, status, expira_em = null, servicos = [], pecas = [] }) {
    if (!Object.values(STATUS).includes(status)) throw new Error(`Status inválido para o orçamento ${id}`);
    this.#status = status;
    this.#expiraEm = expira_em;
    this.#servicos = [...servicos];
    this.#pecas = [...pecas];
  }

  get status() {
    return this.#status;
  }

  get expiraEm() {
    return this.#expiraEm;
  }

  get valorTotal() {
    const servicos = this.#servicos.reduce((total, { valor_unitario }) => total + toCentavos(valor_unitario), 0);
    const pecas = this.#pecas.reduce(
      (total, { quantidade, valor_unitario }) => total + quantidade * toCentavos(valor_unitario),
      0,
    );
    return (servicos + pecas) / 100;
  }

  adicionarServico({ id, preco }) {
    this.#ensureEmDiagnostico();
    if (this.#servicos.some(({ servico_id }) => servico_id === id)) {
      throw new ConflictError('Serviço já adicionado ao orçamento');
    }
    const item = { servico_id: id, valor_unitario: preco };
    this.#incluir(this.#servicos, item);
    return item;
  }

  /** O estoque não é conferido aqui: "Verificar Estoque" acontece ao gerar o orçamento e não bloqueia. */
  adicionarPeca({ id, preco_unitario }, quantidade) {
    this.#ensureEmDiagnostico();
    validarQuantidade(quantidade);
    if (this.#pecas.some(({ peca_id }) => peca_id === id)) {
      throw new ConflictError('Peça/insumo já adicionado ao orçamento');
    }
    const item = { peca_id: id, quantidade, valor_unitario: preco_unitario };
    this.#incluir(this.#pecas, item);
    return item;
  }

  /**
   * Policies "Gerar Orçamento" e "Enviar Orçamento": o rascunho vira o orçamento enviado ao cliente, que vale
   * 14 dias. Já enviado, não faz nada: repetir a conclusão do diagnóstico depois de uma falha não gera de novo.
   */
  gerar(agora) {
    if (this.#status === STATUS.ENVIADO) return;
    this.#ensureEmDiagnostico();
    if (this.#servicos.length === 0 && this.#pecas.length === 0) throw new UnprocessableError(SEM_ITENS);
    this.#status = STATUS.ENVIADO;
    this.#expiraEm = new Date(agora.getTime() + VALIDADE_EM_DIAS * UM_DIA_EM_MS);
  }

  /** Inclui o item só se o total continuar cabendo no orçamento. */
  #incluir(itens, item) {
    itens.push(item);
    if (this.valorTotal > VALOR_TOTAL_MAXIMO) {
      itens.pop();
      throw new UnprocessableError('O item faria o valor total do orçamento passar do limite permitido');
    }
  }

  #ensureEmDiagnostico() {
    if (this.#status !== STATUS.EM_DIAGNOSTICO) {
      throw new ConflictError('O orçamento já foi gerado e não aceita novos itens');
    }
  }
}

module.exports = { Orcamento, STATUS, SEM_ITENS };
