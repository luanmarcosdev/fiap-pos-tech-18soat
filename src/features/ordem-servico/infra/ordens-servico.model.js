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

module.exports = { OrdemServico };
