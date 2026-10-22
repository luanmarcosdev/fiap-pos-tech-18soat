const { sequelize } = require('../../../infra/database/sequelize');
const { Orcamento, OrcamentoServico } = require('./orcamentos.model');

/**
 * Busca o orçamento da OS com a linha travada (SELECT ... FOR UPDATE), criando o rascunho se ainda não existir.
 * A linha travada é o que serializa os itens da OS e a geração do orçamento. O findOrCreate trata a corrida de
 * dois primeiros itens simultâneos (ordem_servico_id é único).
 * O lock fica sem include: o Postgres não aceita FOR UPDATE no lado opcional de um LEFT JOIN.
 */
async function findOrCreateLocked(ordemServicoId, transaction) {
  const [created] = await Orcamento.findOrCreate({ where: { ordem_servico_id: ordemServicoId }, transaction });
  const row = await Orcamento.findByPk(created.id, { transaction, lock: transaction.LOCK.UPDATE });
  const servicos = await OrcamentoServico.findAll({ where: { orcamento_id: row.id }, transaction });
  return { ...row.toJSON(), servicos: servicos.map((servico) => servico.toJSON()) };
}

async function findWithItens(id, transaction) {
  const row = await Orcamento.findByPk(id, {
    include: [{ association: 'servicos' }],
    order: [[{ model: OrcamentoServico, as: 'servicos' }, 'created_at', 'ASC']],
    transaction,
  });
  return row.toJSON();
}

/**
 * Inclui um serviço no orçamento da OS na mesma transação: `change` recebe o orçamento atual com os itens,
 * aplica a regra de domínio e devolve `{ servico, valor_total }`. Se `change` lançar erro, nada é gravado.
 * Devolve o orçamento atualizado com os serviços.
 */
async function addServico(ordemServicoId, change) {
  return sequelize.transaction(async (transaction) => {
    const orcamento = await findOrCreateLocked(ordemServicoId, transaction);
    const { servico, valor_total } = await change(orcamento);
    await OrcamentoServico.create({ ...servico, orcamento_id: orcamento.id }, { transaction });
    await Orcamento.update({ valor_total }, { where: { id: orcamento.id }, transaction });
    return findWithItens(orcamento.id, transaction);
  });
}

module.exports = {
  addServico,
};
