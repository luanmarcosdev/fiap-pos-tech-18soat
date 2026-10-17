'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      usuario: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      senha_hash: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      perfil: {
        type: Sequelize.ENUM('ADMIN'),
        allowNull: false,
        defaultValue: 'ADMIN',
      },
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
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_usuarios_perfil";');
  },
};
