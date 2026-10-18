const { Veiculo } = require('./veiculos.model');

const toPlain = (model) => (model ? model.toJSON() : null);

async function create(data) {
  return toPlain(await Veiculo.create(data));
}

async function findById(id) {
  return toPlain(await Veiculo.findByPk(id));
}

async function findByPlaca(placa) {
  return toPlain(await Veiculo.findOne({ where: { placa } }));
}

async function findAllByCliente(clienteId) {
  const rows = await Veiculo.findAll({ where: { cliente_id: clienteId }, order: [['placa', 'ASC']] });
  return rows.map(toPlain);
}

async function countByCliente(clienteId) {
  return Veiculo.count({ where: { cliente_id: clienteId } });
}

async function findAll({ page, limit, filtros = {} }) {
  const where = {};
  if (filtros.cliente_id) where.cliente_id = filtros.cliente_id;
  if (filtros.placa) where.placa = filtros.placa;

  const { rows, count } = await Veiculo.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [['placa', 'ASC']],
  });
  return { rows: rows.map(toPlain), count };
}

async function update(id, data) {
  const [count, rows] = await Veiculo.update(data, { where: { id }, returning: true });
  return count > 0 ? toPlain(rows[0]) : null;
}

// soft delete (paranoid): preenche deleted_at
async function destroy(id) {
  const count = await Veiculo.destroy({ where: { id } });
  return count > 0;
}

module.exports = {
  create,
  findById,
  findByPlaca,
  findAllByCliente,
  countByCliente,
  findAll,
  update,
  delete: destroy,
};
