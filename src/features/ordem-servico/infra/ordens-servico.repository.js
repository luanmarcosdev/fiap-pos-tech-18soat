const { sequelize } = require('../../../infra/database/sequelize');
const { OrdemServico } = require('./ordens-servico.model');

const toPlain = (model) => (model ? model.toJSON() : null);

async function findById(id) {
  return toPlain(await OrdemServico.findByPk(id));
}

async function findByNumero(numero) {
  return toPlain(await OrdemServico.findOne({ where: { numero } }));
}

/**
 * Altera a OS de forma segura sob concorrência: trava a linha (SELECT ... FOR NO KEY UPDATE),
 * entrega os dados atuais para `change` (que aplica a regra de domínio e devolve os novos valores)
 * e grava antes de liberar a linha. Se `change` lançar erro, a transação é desfeita.
 * NO KEY UPDATE serializa os comandos sobre a OS sem bloquear quem grava um orçamento com FK para ela.
 * Devolve a OS atualizada ou null se ela não existir.
 */
async function updateWithLock(id, change) {
  return sequelize.transaction(async (transaction) => {
    const row = await OrdemServico.findByPk(id, { transaction, lock: transaction.LOCK.NO_KEY_UPDATE });
    if (!row) return null;
    const data = await change(row.toJSON());
    await row.update(data, { transaction });
    return row.toJSON();
  });
}

module.exports = {
  findById,
  findByNumero,
  updateWithLock,
};
