const { UnprocessableError } = require('../../../shared/errors');
const { OrdemServico } = require('../domain/ordem-servico.entity');

/**
 * Comando "Cria Ordem de Serviço" (atendente): fecha o atendimento com o cliente e o veículo já identificados ou
 * cadastrados. A OS nasce RECEBIDA e o cliente é notificado.
 */
class CriarOrdemServico {
  #ordensServicoRepository;
  #getClienteById;
  #listVeiculosByCliente;
  #notificarCliente;

  /** getClienteById e listVeiculosByCliente vêm das interfaces públicas dos slices clientes e veiculos. */
  constructor({ ordensServicoRepository, getClienteById, listVeiculosByCliente, notificarCliente }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#getClienteById = getClienteById;
    this.#listVeiculosByCliente = listVeiculosByCliente;
    this.#notificarCliente = notificarCliente;
  }

  async execute({ cliente_id, veiculo_id, queixa }) {
    const dados = OrdemServico.criar({ cliente_id, veiculo_id, queixa });
    await this.#ensureVeiculoDoCliente(cliente_id, veiculo_id);

    const ordemServico = await this.#ordensServicoRepository.create(dados);

    // só depois de gravar: a mesma regra do IniciarDiagnostico, e a policy não lança por falha do sistema externo
    await this.#notificarCliente.execute(new OrdemServico(ordemServico).criada());
    return ordemServico;
  }

  /** veiculos não expõe busca por id: o veículo precisa estar na lista do cliente (removidos não aparecem). */
  async #ensureVeiculoDoCliente(clienteId, veiculoId) {
    const [cliente, veiculos] = await Promise.all([
      this.#getClienteById(clienteId),
      this.#listVeiculosByCliente(clienteId),
    ]);
    if (!cliente) throw new UnprocessableError('Cliente não encontrado');
    if (!veiculos.some(({ id }) => id === veiculoId)) {
      throw new UnprocessableError('Veículo não encontrado para o cliente');
    }
  }
}

module.exports = { CriarOrdemServico };
