const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');
const { STATUS } = require('../domain/orcamento.entity');
const { Orcamento, OrcamentoServico, OrcamentoPeca } = require('./orcamentos.model');

const toPlainList = (rows) => rows.map((row) => row.toJSON());

// o lock fica sem include: o Postgres não aceita FOR UPDATE no lado opcional de um LEFT JOIN
const findLocked = (where, transaction) => Orcamento.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });

async function withItens(row, transaction) {
  const where = { orcamento_id: row.id };
  const servicos = await OrcamentoServico.findAll({ where, transaction });
  const pecas = await OrcamentoPeca.findAll({ where, transaction });
  return { ...row.toJSON(), servicos: toPlainList(servicos), pecas: toPlainList(pecas) };
}

/**
 * Busca o orçamento da OS com a linha travada (SELECT ... FOR UPDATE), criando o rascunho se ainda não existir.
 * A linha travada é o que serializa os itens da OS e a geração do orçamento. O findOrCreate trata a corrida de
 * dois primeiros itens simultâneos (ordem_servico_id é único).
 */
async function findOrCreateLocked(ordemServicoId, transaction) {
  await Orcamento.findOrCreate({ where: { ordem_servico_id: ordemServicoId }, transaction });
  return withItens(await findLocked({ ordem_servico_id: ordemServicoId }, transaction), transaction);
}

const comItens = {
  include: [{ association: 'servicos' }, { association: 'pecas' }],
  order: [
    [{ model: OrcamentoServico, as: 'servicos' }, 'created_at', 'ASC'],
    [{ model: OrcamentoPeca, as: 'pecas' }, 'created_at', 'ASC'],
  ],
};

async function findWithItens(id, transaction) {
  const row = await Orcamento.findByPk(id, { ...comItens, transaction });
  return row.toJSON();
}

async function findByOrdemServico(ordemServicoId) {
  const row = await Orcamento.findOne({ where: { ordem_servico_id: ordemServicoId }, ...comItens });
  return row ? row.toJSON() : null;
}

/**
 * Inclui um item no orçamento da OS na mesma transação: `change` recebe o orçamento atual com os itens,
 * aplica a regra de domínio e devolve `{ item, valor_total }`. Se `change` lançar erro, nada é gravado.
 * Devolve o orçamento atualizado com os itens.
 */
async function addItem(ItemModel, ordemServicoId, change) {
  return sequelize.transaction(async (transaction) => {
    const orcamento = await findOrCreateLocked(ordemServicoId, transaction);
    const { item, valor_total } = await change(orcamento);
    await ItemModel.create({ ...item, orcamento_id: orcamento.id }, { transaction });
    await Orcamento.update({ valor_total }, { where: { id: orcamento.id }, transaction });
    return findWithItens(orcamento.id, transaction);
  });
}

/**
 * Altera o orçamento da OS com a linha travada: `change` recebe o orçamento atual com os itens, aplica a regra
 * de domínio e devolve os novos valores. Se `change` lançar erro, nada é gravado.
 * Devolve o orçamento atualizado com os itens ou null se a OS ainda não tiver orçamento.
 */
async function updateWithLock(ordemServicoId, change) {
  return sequelize.transaction(async (transaction) => {
    const row = await findLocked({ ordem_servico_id: ordemServicoId }, transaction);
    if (!row) return null;
    const data = await change(await withItens(row, transaction));
    await row.update(data, { transaction });
    return findWithItens(row.id, transaction);
  });
}

/**
 * Quantidade de cada peça reservada por orçamentos enviados (aguardando o cliente), sem contar `excetoOrcamentoId`.
 * Devolve `{ [peca_id]: quantidade }`; peças sem reserva ficam de fora.
 */
async function sumReservasByPeca(pecaIds, excetoOrcamentoId) {
  if (pecaIds.length === 0) return {};
  const rows = await OrcamentoPeca.findAll({
    attributes: ['peca_id', [fn('SUM', col('quantidade')), 'reservado']],
    where: { peca_id: pecaIds },
    include: [
      { model: Orcamento, attributes: [], where: { status: STATUS.ENVIADO, id: { [Op.ne]: excetoOrcamentoId } } },
    ],
    group: ['peca_id'],
    raw: true,
  });
  // SUM volta como string do driver
  return Object.fromEntries(rows.map(({ peca_id, reservado }) => [peca_id, Number(reservado)]));
}

module.exports = {
  addServico: (ordemServicoId, change) => addItem(OrcamentoServico, ordemServicoId, change),
  addPeca: (ordemServicoId, change) => addItem(OrcamentoPeca, ordemServicoId, change),
  findByOrdemServico,
  updateWithLock,
  sumReservasByPeca,
};
