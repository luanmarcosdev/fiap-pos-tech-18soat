const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');

const Cliente = sequelize.define(
  'Cliente',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    documento: { type: DataTypes.STRING(14), allowNull: false },
    tipo_pessoa: { type: DataTypes.ENUM('PF', 'PJ'), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: true },
    telefone: { type: DataTypes.STRING(20), allowNull: false },
    cep: { type: DataTypes.CHAR(8), allowNull: false },
    rua: { type: DataTypes.STRING(150), allowNull: false },
    numero: { type: DataTypes.STRING(10), allowNull: false },
    complemento: { type: DataTypes.STRING(100), allowNull: true },
    bairro: { type: DataTypes.STRING(100), allowNull: false },
    cidade: { type: DataTypes.STRING(100), allowNull: false },
    estado: { type: DataTypes.CHAR(2), allowNull: false },
  },
  {
    tableName: 'clientes',
    underscored: true,
    paranoid: true,
    // underscored só renomeia as colunas; aqui os atributos (e o JSON da API) também ficam em snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
);

// deleted_at é detalhe do soft delete, não faz parte do cliente exposto pela API
Cliente.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  delete values.deleted_at;
  return values;
};

module.exports = { Cliente };
