const { NotFoundError } = require('../../../shared/errors');

// mesma resposta para OS inexistente e documento que não confere, para não revelar quais números existem
const NOT_FOUND = 'Ordem de serviço não encontrada';

/**
 * Comando "Consulta Ordem de Serviço" (cliente, API aberta): o cliente se identifica com o número da OS e o
 * documento dele, porque o número sozinho é sequencial e permitiria ver a OS de outra pessoa.
 */
class ConsultarOrdemServico {
  #ordensServicoRepository;
  #getClienteByDocumento;
  #listVeiculosByCliente;

  constructor({ ordensServicoRepository, getClienteByDocumento, listVeiculosByCliente }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#getClienteByDocumento = getClienteByDocumento;
    this.#listVeiculosByCliente = listVeiculosByCliente;
  }

  async execute({ numero, documento }) {
    const ordemServico = await this.#findDoCliente(numero, documento);
    const veiculos = await this.#listVeiculosByCliente(ordemServico.cliente_id);
    const veiculo = veiculos.find(({ id }) => id === ordemServico.veiculo_id);
    return this.#toView(ordemServico, veiculo);
  }

  async #findDoCliente(numero, documento) {
    const [ordemServico, cliente] = await Promise.all([
      this.#ordensServicoRepository.findByNumero(numero),
      this.#getClienteByDocumento(documento),
    ]);
    if (!ordemServico || !cliente || ordemServico.cliente_id !== cliente.id) throw new NotFoundError(NOT_FOUND);
    return ordemServico;
  }

  /** Só o que interessa ao cliente: sem ids internos nem dados pessoais. */
  #toView(ordemServico, veiculo) {
    const { numero, status, queixa, diagnostico, created_at, updated_at } = ordemServico;
    return {
      numero,
      status,
      queixa,
      diagnostico,
      veiculo: veiculo
        ? { placa: veiculo.placa, marca: veiculo.marca, modelo: veiculo.modelo, ano: veiculo.ano }
        : null,
      created_at,
      updated_at,
    };
  }
}

module.exports = { ConsultarOrdemServico };
