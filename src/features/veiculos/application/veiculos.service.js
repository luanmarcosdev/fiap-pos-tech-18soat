const { ConflictError, NotFoundError, UnprocessableError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');
const { Placa } = require('../domain/placa.vo');

const NOT_FOUND = 'Veículo não encontrado';
const DUPLICATED = 'Já existe um veículo com esta placa';

function makeVeiculosService({ veiculosRepository, getClienteById }) {
  async function getById(id) {
    const veiculo = await veiculosRepository.findById(id);
    if (!veiculo) throw new NotFoundError(NOT_FOUND);
    return veiculo;
  }

  async function ensureClienteExists(clienteId) {
    if (!(await getClienteById(clienteId))) throw new UnprocessableError('Cliente não encontrado');
  }

  return {
    getById,

    async create(payload) {
      const placa = Placa.create(payload.placa);
      await ensureClienteExists(payload.cliente_id);
      if (await veiculosRepository.findByPlaca(placa.valor)) throw new ConflictError(DUPLICATED);
      return veiculosRepository.create({ ...payload, placa: placa.valor });
    },

    async list({ page, limit, cliente_id, placa }) {
      const { rows, count } = await veiculosRepository.findAll({ page, limit, filtros: { cliente_id, placa } });
      return paginate(rows, count, page, limit);
    },

    async update(id, payload) {
      await getById(id);
      const placa = Placa.create(payload.placa);
      await ensureClienteExists(payload.cliente_id);
      const owner = await veiculosRepository.findByPlaca(placa.valor);
      if (owner && owner.id !== id) throw new ConflictError(DUPLICATED);
      return veiculosRepository.update(id, { ...payload, placa: placa.valor });
    },

    async remove(id) {
      const removed = await veiculosRepository.delete(id);
      if (!removed) throw new NotFoundError(NOT_FOUND);
    },
  };
}

module.exports = { makeVeiculosService };
