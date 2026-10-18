const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');

const Servico = sequelize.define(
  'Servico',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'servicos',
    underscored: true,
    paranoid: true,
    // underscored só renomeia as colunas; aqui os atributos (e o JSON da API) também ficam em snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
);

// deleted_at é detalhe do soft delete, não faz parte do serviço exposto pela API
Servico.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  delete values.deleted_at;
  return values;
};

module.exports = { Servico };
