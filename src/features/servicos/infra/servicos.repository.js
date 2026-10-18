const { Op } = require('sequelize');
const { containsIgnoringAccents, equalsIgnoringAccents } = require('../../../infra/database/text-search');
const { Servico } = require('./servicos.model');

const toPlain = (model) => (model ? model.toJSON() : null);

async function create(data) {
  return toPlain(await Servico.create(data));
}

async function findById(id) {
  return toPlain(await Servico.findByPk(id));
}

// mesma regra do índice único: compara sem diferenciar maiúsculas nem acentos
async function findByNome(nome) {
  return toPlain(await Servico.findOne({ where: equalsIgnoringAccents('nome', nome) }));
}

async function findAll({ page, limit, filtros = {} }) {
  const where = {};
  if (filtros.nome) where[Op.and] = [containsIgnoringAccents('nome', filtros.nome)];

  const { rows, count } = await Servico.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [['nome', 'ASC']],
  });
  return { rows: rows.map(toPlain), count };
}

async function update(id, data) {
  const [count, rows] = await Servico.update(data, { where: { id }, returning: true });
  return count > 0 ? toPlain(rows[0]) : null;
}

// soft delete (paranoid): preenche deleted_at
async function destroy(id) {
  const count = await Servico.destroy({ where: { id } });
  return count > 0;
}

module.exports = {
  create,
  findById,
  findByNome,
  findAll,
  update,
  delete: destroy,
};
