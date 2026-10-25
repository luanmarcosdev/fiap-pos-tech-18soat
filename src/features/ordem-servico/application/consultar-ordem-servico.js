const { NotFoundError } = require('../../../shared/errors');
const { OrdemServico, STATUS } = require('../domain/ordem-servico.entity');

// mesma resposta para OS inexistente e documento que não confere, para não revelar quais números existem
const NOT_FOUND = 'Ordem de serviço não encontrada';

const SITUACAO_POR_STATUS = {
  [STATUS.RECEBIDA]: 'Ordem de serviço recebida',
  [STATUS.EM_DIAGNOSTICO]: 'Veículo em diagnóstico',
  [STATUS.AGUARDANDO_APROVACAO]: 'Orçamento aguardando sua aprovação',
  [STATUS.EM_EXECUCAO]: 'Em manutenção',
  [STATUS.FINALIZADA]: 'Manutenção finalizada',
  [STATUS.ENTREGUE]: 'Veículo entregue',
};

// status do orçamento como a API pública do slice orcamento devolve; o domínio dele não é importado daqui
const SITUACAO_POR_ORCAMENTO = {
  APROVADO: 'Orçamento aprovado. Aguardando o início da manutenção',
  REPROVADO: 'Orçamento reprovado. Ordem de serviço encerrada',
  EXPIRADO: 'Orçamento expirado. Ordem de serviço encerrada',
};

/**
 * Situação para o cliente ler. Depois do "Aprova Orçamento" a OS segue AGUARDANDO_APROVACAO até o "Inicia
 * Manutenção" (event storming), então o status sozinho faria o cliente achar que a aprovação não foi registrada.
 * A OS não muda de status aqui: é só a leitura dos dois status juntos.
 */
function situacao(status, orcamentoStatus) {
  const decisao = SITUACAO_POR_ORCAMENTO[orcamentoStatus];
  // inclui reprovado/expirado com a OS ainda não finalizada (falha no meio da policy "Finalizar Ordem de Serviço")
  if (status === STATUS.AGUARDANDO_APROVACAO && decisao) return decisao;
  // finalizada com orçamento aprovado é manutenção concluída; com reprovado/expirado, encerrada sem manutenção
  if (status === STATUS.FINALIZADA && orcamentoStatus !== 'APROVADO' && decisao) return decisao;
  return SITUACAO_POR_STATUS[status];
}

/**
 * Comando "Consulta Ordem de Serviço" (cliente, API aberta): o cliente se identifica com o número da OS e o
 * documento dele, porque o número sozinho é sequencial e permitiria ver a OS de outra pessoa.
 * Também é onde o cliente vê o orçamento enviado para aprovação.
 */
class ConsultarOrdemServico {
  #ordensServicoRepository;
  #getClienteByDocumento;
  #listVeiculosByCliente;
  #getOrcamentoEnviadoByOrdemServico;

  /** As funções vêm das interfaces públicas dos slices clientes, veiculos e orcamento. */
  constructor({
    ordensServicoRepository,
    getClienteByDocumento,
    listVeiculosByCliente,
    getOrcamentoEnviadoByOrdemServico,
  }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#getClienteByDocumento = getClienteByDocumento;
    this.#listVeiculosByCliente = listVeiculosByCliente;
    this.#getOrcamentoEnviadoByOrdemServico = getOrcamentoEnviadoByOrdemServico;
  }

  async execute({ numero, documento }) {
    const ordemServico = await this.#findDoCliente(numero, documento);
    const [veiculos, orcamento] = await Promise.all([
      this.#listVeiculosByCliente(ordemServico.cliente_id),
      this.#findOrcamentoEnviado(ordemServico),
    ]);
    const veiculo = veiculos.find(({ id }) => id === ordemServico.veiculo_id);
    return this.#toView(ordemServico, veiculo, orcamento);
  }

  async #findDoCliente(numero, documento) {
    const [ordemServico, cliente] = await Promise.all([
      this.#ordensServicoRepository.findByNumero(numero),
      this.#getClienteByDocumento(documento),
    ]);
    if (!ordemServico || !cliente || ordemServico.cliente_id !== cliente.id) throw new NotFoundError(NOT_FOUND);
    return ordemServico;
  }

  /**
   * Antes da conclusão o orçamento é o rascunho do mecânico. O status da OS evita a consulta; o slice orcamento
   * confere o status do próprio orçamento e devolve null se ele não tiver sido enviado.
   */
  async #findOrcamentoEnviado(ordemServico) {
    if (!new OrdemServico(ordemServico).diagnosticoConcluido) return null;
    return this.#getOrcamentoEnviadoByOrdemServico(ordemServico.id);
  }

  /** Só o que interessa ao cliente: sem ids internos nem dados pessoais. */
  #toView(ordemServico, veiculo, orcamento) {
    const { numero, status, queixa, diagnostico, created_at, updated_at } = ordemServico;
    return {
      numero,
      status,
      situacao: situacao(status, orcamento?.status),
      queixa,
      diagnostico,
      veiculo: veiculo
        ? { placa: veiculo.placa, marca: veiculo.marca, modelo: veiculo.modelo, ano: veiculo.ano }
        : null,
      orcamento: orcamento ? this.#toOrcamentoView(orcamento) : null,
      created_at,
      updated_at,
    };
  }

  #toOrcamentoView({ status, valor_total, expira_em, servicos, pecas }) {
    return {
      status,
      valor_total,
      expira_em,
      servicos: servicos.map(({ nome, valor_unitario }) => ({ nome, valor_unitario })),
      pecas: pecas.map(({ nome, tipo, unidade_medida, quantidade, valor_unitario, subtotal }) => ({
        nome,
        tipo,
        unidade_medida,
        quantidade,
        valor_unitario,
        subtotal,
      })),
    };
  }
}

module.exports = { ConsultarOrdemServico };
