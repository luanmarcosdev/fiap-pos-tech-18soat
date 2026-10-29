const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');
const { OrdemServico, OrdemServicoHistorico } = require('./ordens-servico.model');

const toPlain = (model) => (model ? model.toJSON() : null);

/**
 * Registra a mudança de status no histórico, na transação da própria mudança. Toda gravação de status da OS passa
 * por `create` e `updateWithLock`, então o histórico fica completo sem depender de cada caso de uso lembrar dele.
 */
async function registrarStatus({ id, status, updated_at }, statusAnterior, transaction) {
  await OrdemServicoHistorico.create(
    { ordem_servico_id: id, status_anterior: statusAnterior, status, alterado_em: updated_at },
    { transaction },
  );
}

// o Postgres devolve a linha gravada (RETURNING), então o número gerado pelo banco já vem preenchido
async function create(data) {
  return sequelize.transaction(async (transaction) => {
    const ordemServico = toPlain(await OrdemServico.create(data, { transaction }));
    await registrarStatus(ordemServico, null, transaction);
    return ordemServico;
  });
}

async function findById(id) {
  return toPlain(await OrdemServico.findByPk(id));
}

async function findByNumero(numero) {
  return toPlain(await OrdemServico.findOne({ where: { numero } }));
}

async function findAll({ page, limit, filtros = {} }) {
  const where = {};
  if (filtros.status) where.status = filtros.status;
  if (filtros.cliente_id) where.cliente_id = filtros.cliente_id;
  if (filtros.veiculo_id) where.veiculo_id = filtros.veiculo_id;

  const { rows, count } = await OrdemServico.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    // numero desempata OS criadas no mesmo instante, para a paginação não repetir nem pular registros
    order: [
      ['created_at', 'DESC'],
      ['numero', 'DESC'],
    ],
  });
  return { rows: rows.map(toPlain), count };
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
    const atual = row.toJSON();
    const data = await change(atual);
    await row.update(data, { transaction });
    const ordemServico = row.toJSON();
    if (ordemServico.status !== atual.status) await registrarStatus(ordemServico, atual.status, transaction);
    return ordemServico;
  });
}

// agregações em SQL: o banco percorre o histórico sem trazer as linhas para a aplicação. O filtro de período vale
// sobre o fim da etapa (calculado), então o histórico é lido inteiro — suficiente para o volume de uma oficina
const FIM_DO_PERIODO = `
  (:de::date IS NULL OR fim >= (:de::date)::timestamp AT TIME ZONE 'America/Sao_Paulo')
  AND (:ate::date IS NULL OR fim < (:ate::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')`;

/**
 * Tempos médios em segundos, considerando as etapas encerradas no período (datas de Brasília, inclusivas):
 * `total` vai da abertura da OS à entrega do veículo (inclui OS com orçamento reprovado, que também são entregues);
 * `porStatus` é quanto a OS ficou em cada status até sair dele.
 */
async function findAverageTimes({ de = null, ate = null } = {}) {
  const replacements = { de, ate };
  const [total] = await sequelize.query(
    `SELECT COUNT(*)::int AS quantidade, AVG(EXTRACT(EPOCH FROM (fim - inicio)))::float AS media_segundos
     FROM (
       SELECT os.created_at AS inicio, h.alterado_em AS fim
       FROM ordens_servico os
       JOIN ordens_servico_historico h ON h.ordem_servico_id = os.id AND h.status = 'ENTREGUE'
     ) entregas
     WHERE ${FIM_DO_PERIODO}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const porStatus = await sequelize.query(
    `SELECT status, COUNT(*)::int AS quantidade, AVG(EXTRACT(EPOCH FROM (fim - inicio)))::float AS media_segundos
     FROM (
       SELECT status, alterado_em AS inicio,
              LEAD(alterado_em) OVER (PARTITION BY ordem_servico_id ORDER BY alterado_em, sequencia) AS fim
       FROM ordens_servico_historico
     ) etapas
     WHERE fim IS NOT NULL AND ${FIM_DO_PERIODO}
     GROUP BY status`,
    { replacements, type: QueryTypes.SELECT },
  );
  return { total, porStatus };
}

module.exports = {
  create,
  findById,
  findByNumero,
  findAll,
  updateWithLock,
  findAverageTimes,
};
