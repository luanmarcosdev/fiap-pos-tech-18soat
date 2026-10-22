const { NotFoundError } = require('../../../shared/errors');

const NOT_FOUND = 'Ordem de serviço não encontrada';

/** "Detalhamento de Ordens de Serviço" (gestão administrativa): a OS com cliente, veículo e orçamento. */
class DetalharOrdemServico {
  #ordensServicoRepository;
  #getClienteById;
  #listVeiculosByCliente;
  #getOrcamentoByOrdemServico;

  /** As funções vêm das interfaces públicas dos slices clientes, veiculos e orcamento. */
  constructor({ ordensServicoRepository, getClienteById, listVeiculosByCliente, getOrcamentoByOrdemServico }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#getClienteById = getClienteById;
    this.#listVeiculosByCliente = listVeiculosByCliente;
    this.#getOrcamentoByOrdemServico = getOrcamentoByOrdemServico;
  }

  async execute(id) {
    const ordemServico = await this.#ordensServicoRepository.findById(id);
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);

    const [cliente, veiculos, orcamento] = await Promise.all([
      this.#getClienteById(ordemServico.cliente_id),
      this.#listVeiculosByCliente(ordemServico.cliente_id),
      this.#getOrcamentoByOrdemServico(id),
    ]);
    // veiculos não expõe busca por id: o veículo vem da lista do cliente da OS
    const veiculo = veiculos.find(({ id: veiculoId }) => veiculoId === ordemServico.veiculo_id);

    // null quando o cadastro foi removido (soft delete) ou o veículo passou para outro cliente depois da OS
    return {
      ...ordemServico,
      cliente: cliente ? this.#resumoCliente(cliente) : null,
      veiculo: veiculo ? this.#resumoVeiculo(veiculo) : null,
      orcamento,
    };
  }

  #resumoCliente({ id, nome, documento, telefone, email }) {
    return { id, nome, documento, telefone, email };
  }

  #resumoVeiculo({ id, placa, marca, modelo, ano }) {
    return { id, placa, marca, modelo, ano };
  }
}

module.exports = { DetalharOrdemServico };
