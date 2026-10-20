const { sequelize } = require('../../../infra/database/sequelize');
const { OrdemServico } = require('./ordens-servico.model');

/**
 * Altera a OS de forma segura sob concorrência: trava a linha (SELECT ... FOR UPDATE),
 * entrega os dados atuais para `change` (que aplica a regra de domínio e devolve os novos valores)
 * e grava antes de liberar a linha. Se `change` lançar erro, a transação é desfeita.
 * Devolve a OS atualizada ou null se ela não existir.
 */
async function updateWithLock(id, change) {
  return sequelize.transaction(async (transaction) => {
    const row = await OrdemServico.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) return null;
    const data = await change(row.toJSON());
    await row.update(data, { transaction });
    return row.toJSON();
  });
}

module.exports = {
  updateWithLock,
};
