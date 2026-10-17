'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clientes', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      nome: { type: Sequelize.STRING(150), allowNull: false },
      documento: { type: Sequelize.STRING(14), allowNull: false },
      tipo_pessoa: { type: Sequelize.ENUM('PF', 'PJ'), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: true },
      telefone: { type: Sequelize.STRING(20), allowNull: false },
      cep: { type: Sequelize.CHAR(8), allowNull: false },
      rua: { type: Sequelize.STRING(150), allowNull: false },
      numero: { type: Sequelize.STRING(10), allowNull: false },
      complemento: { type: Sequelize.STRING(100), allowNull: true },
      bairro: { type: Sequelize.STRING(100), allowNull: false },
      cidade: { type: Sequelize.STRING(100), allowNull: false },
      estado: { type: Sequelize.CHAR(2), allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    // único só entre os ativos: um cliente removido não bloqueia o recadastro do mesmo documento
    await queryInterface.addIndex('clientes', ['documento'], {
      name: 'clientes_documento_unique',
      unique: true,
      where: { deleted_at: null },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('clientes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clientes_tipo_pessoa";');
  },
};
