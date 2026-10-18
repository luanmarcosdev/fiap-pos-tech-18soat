const { Op, literal } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');
const { containsIgnoringAccents } = require('../../../infra/database/text-search');
const { Peca } = require('./pecas.model');

const toPlain = (model) => (model ? model.toJSON() : null);

const ABAIXO_DO_MINIMO = literal('"quantidade_estoque" <= "estoque_minimo"');

async function create(data) {
  return toPlain(await Peca.create(data));
}

async function findById(id) {
  return toPlain(await Peca.findByPk(id));
}

async function findByCodigo(codigo) {
  return toPlain(await Peca.findOne({ where: { codigo } }));
}

async function findAll({ page, limit, filtros = {} }) {
  const where = {};
  const and = [];
  if (filtros.codigo) where.codigo = filtros.codigo;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.nome) and.push(containsIgnoringAccents('nome', filtros.nome));
  if (filtros.abaixo_minimo) and.push(ABAIXO_DO_MINIMO);
  if (and.length > 0) where[Op.and] = and;

  const { rows, count } = await Peca.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [['nome', 'ASC']],
  });
  return { rows: rows.map(toPlain), count };
}

async function update(id, data) {
  const [count, rows] = await Peca.update(data, { where: { id }, returning: true });
  return count > 0 ? toPlain(rows[0]) : null;
}

/**
 * Altera o estoque de forma segura sob concorrência: trava a linha (SELECT ... FOR UPDATE),
 * entrega os dados atuais para `change` (que aplica a regra de domínio e devolve os novos valores)
 * e grava antes de liberar a linha. Se `change` lançar erro, a transação é desfeita.
 * Devolve a peça atualizada ou null se ela não existir.
 */
async function updateStock(id, change) {
  return sequelize.transaction(async (transaction) => {
    const row = await Peca.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) return null;
    const stock = await change(row.toJSON());
    await row.update(stock, { transaction });
    return row.toJSON();
  });
}

// soft delete (paranoid): preenche deleted_at
async function destroy(id) {
  const count = await Peca.destroy({ where: { id } });
  return count > 0;
}

module.exports = {
  create,
  findById,
  findByCodigo,
  findAll,
  update,
  updateStock,
  delete: destroy,
};
