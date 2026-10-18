const { ConflictError, NotFoundError, UnprocessableError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');
const { Placa } = require('../domain/placa.vo');

const NOT_FOUND = 'Veículo não encontrado';
const DUPLICATED = 'Já existe um veículo com esta placa';

class VeiculosService {
  #veiculosRepository;
  #getClienteById;

  /** getClienteById vem da interface pública do slice clientes. */
  constructor({ veiculosRepository, getClienteById }) {
    this.#veiculosRepository = veiculosRepository;
    this.#getClienteById = getClienteById;
  }

  async getById(id) {
    const veiculo = await this.#veiculosRepository.findById(id);
    if (!veiculo) throw new NotFoundError(NOT_FOUND);
    return veiculo;
  }

  async create(payload) {
    const data = this.#buildVeiculoData(payload);
    await this.#ensureClienteExists(data.cliente_id);
    await this.#ensurePlacaIsAvailable(data.placa);
    return this.#veiculosRepository.create(data);
  }

  async list({ page, limit, cliente_id, placa }) {
    const { rows, count } = await this.#veiculosRepository.findAll({ page, limit, filtros: { cliente_id, placa } });
    return paginate(rows, count, page, limit);
  }

  async update(id, payload) {
    await this.getById(id);
    const data = this.#buildVeiculoData(payload);
    await this.#ensureClienteExists(data.cliente_id);
    await this.#ensurePlacaIsAvailable(data.placa, id);
    return this.#veiculosRepository.update(id, data);
  }

  async remove(id) {
    const removed = await this.#veiculosRepository.delete(id);
    if (!removed) throw new NotFoundError(NOT_FOUND);
  }

  /** Dados prontos para gravar: placa validada e normalizada (sem hífen, em maiúsculas). */
  #buildVeiculoData(payload) {
    const placa = Placa.create(payload.placa);
    return { ...payload, placa: placa.valor };
  }

  async #ensureClienteExists(clienteId) {
    const cliente = await this.#getClienteById(clienteId);
    if (!cliente) throw new UnprocessableError('Cliente não encontrado');
  }

  /** A placa não pode pertencer a outro veículo. `veiculoId` é o próprio veículo numa atualização. */
  async #ensurePlacaIsAvailable(placa, veiculoId = null) {
    const owner = await this.#veiculosRepository.findByPlaca(placa);
    if (owner && owner.id !== veiculoId) throw new ConflictError(DUPLICATED);
  }
}

module.exports = { VeiculosService };
