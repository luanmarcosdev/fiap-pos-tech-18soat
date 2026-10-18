const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');

const Peca = sequelize.define(
  'Peca',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    codigo: { type: DataTypes.STRING(30), allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    tipo: { type: DataTypes.ENUM('PECA', 'INSUMO'), allowNull: false },
    unidade_medida: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'UN' },
    preco_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    quantidade_estoque: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estoque_minimo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'pecas',
    underscored: true,
    paranoid: true,
    // underscored só renomeia as colunas; aqui os atributos (e o JSON da API) também ficam em snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
);

Peca.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  // deleted_at é detalhe do soft delete, não faz parte da peça exposta pela API
  delete values.deleted_at;
  // o driver do Postgres devolve DECIMAL como string para não perder precisão
  if (values.preco_unitario != null) values.preco_unitario = Number(values.preco_unitario);
  return values;
};

module.exports = { Peca };
