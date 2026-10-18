'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('servicos', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
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

    // único entre os ativos e sem diferenciar maiúsculas: "Troca de óleo" e "troca de óleo" são o mesmo serviço
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX servicos_nome_unique ON servicos (lower(nome)) WHERE deleted_at IS NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('servicos');
  },
};
