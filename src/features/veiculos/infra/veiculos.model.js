const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');

const Veiculo = sequelize.define(
  'Veiculo',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // sem associação Sequelize com Cliente: o vínculo é validado pela interface pública do slice clientes
    cliente_id: { type: DataTypes.UUID, allowNull: false },
    placa: { type: DataTypes.STRING(7), allowNull: false },
    marca: { type: DataTypes.STRING(50), allowNull: false },
    modelo: { type: DataTypes.STRING(80), allowNull: false },
    ano: { type: DataTypes.SMALLINT, allowNull: false },
    cor: { type: DataTypes.STRING(30), allowNull: true },
  },
  {
    tableName: 'veiculos',
    underscored: true,
    paranoid: true,
    // underscored só renomeia as colunas; aqui os atributos (e o JSON da API) também ficam em snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
);

// deleted_at é detalhe do soft delete, não faz parte do veículo exposto pela API
Veiculo.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  delete values.deleted_at;
  return values;
};

module.exports = { Veiculo };
