const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');
const { STATUS } = require('../domain/ordem-servico.entity');

const OrdemServico = sequelize.define(
  'OrdemServico',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // gerado pelo banco (serial)
    numero: { type: DataTypes.INTEGER, autoIncrement: true },
    cliente_id: { type: DataTypes.UUID, allowNull: false },
    veiculo_id: { type: DataTypes.UUID, allowNull: false },
    queixa: { type: DataTypes.TEXT, allowNull: false },
    diagnostico: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(STATUS)), allowNull: false, defaultValue: STATUS.RECEBIDA },
  },
  {
    tableName: 'ordens_servico',
    underscored: true,
    // underscored só renomeia as colunas; aqui os atributos (e o JSON da API) também ficam em snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

// uma linha por mudança de status (base do tempo médio); só inserida, nunca alterada
const OrdemServicoHistorico = sequelize.define(
  'OrdemServicoHistorico',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ordem_servico_id: { type: DataTypes.UUID, allowNull: false },
    status_anterior: { type: DataTypes.STRING(30), allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false },
    alterado_em: { type: DataTypes.DATE, allowNull: false },
    // gerado pelo banco (bigserial)
    sequencia: { type: DataTypes.BIGINT, autoIncrement: true },
  },
  { tableName: 'ordens_servico_historico', underscored: true, timestamps: false },
);

module.exports = { OrdemServico, OrdemServicoHistorico };
