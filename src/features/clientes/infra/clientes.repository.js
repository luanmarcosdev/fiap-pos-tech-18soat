const { Op } = require('sequelize');
const { escapeLike } = require('../../../infra/database/escape-like');
const { Cliente } = require('./clientes.model');

const toPlain = (model) => (model ? model.toJSON() : null);

async function create(data) {
  return toPlain(await Cliente.create(data));
}

async function findById(id) {
  return toPlain(await Cliente.findByPk(id));
}

async function findByDocumento(documento) {
  return toPlain(await Cliente.findOne({ where: { documento } }));
}

async function findAll({ page, limit, filtros = {} }) {
  const where = {};
  if (filtros.nome) where.nome = { [Op.iLike]: `%${escapeLike(filtros.nome)}%` };
  if (filtros.documento) where.documento = filtros.documento;

  const { rows, count } = await Cliente.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [['nome', 'ASC']],
  });
  return { rows: rows.map(toPlain), count };
}

async function update(id, data) {
  const [count, rows] = await Cliente.update(data, { where: { id }, returning: true });
  return count > 0 ? toPlain(rows[0]) : null;
}

// soft delete (paranoid): preenche deleted_at
async function destroy(id) {
  const count = await Cliente.destroy({ where: { id } });
  return count > 0;
}

module.exports = {
  create,
  findById,
  findByDocumento,
  findAll,
  update,
  delete: destroy,
};
