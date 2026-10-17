const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');

const Usuario = sequelize.define(
  'Usuario',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    senha_hash: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    perfil: {
      type: DataTypes.ENUM('ADMIN'),
      allowNull: false,
      defaultValue: 'ADMIN',
    },
  },
  {
    tableName: 'usuarios',
    underscored: true,
    // underscored só renomeia as colunas; aqui os atributos também ficam em snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

module.exports = { Usuario };
