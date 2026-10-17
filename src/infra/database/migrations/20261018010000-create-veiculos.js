'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('veiculos', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      cliente_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      placa: { type: Sequelize.STRING(7), allowNull: false },
      marca: { type: Sequelize.STRING(50), allowNull: false },
      modelo: { type: Sequelize.STRING(80), allowNull: false },
      ano: { type: Sequelize.SMALLINT, allowNull: false },
      cor: { type: Sequelize.STRING(30), allowNull: true },
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

    // único só entre os ativos: um veículo removido não bloqueia o recadastro da mesma placa
    await queryInterface.addIndex('veiculos', ['placa'], {
      name: 'veiculos_placa_unique',
      unique: true,
      where: { deleted_at: null },
    });
    await queryInterface.addIndex('veiculos', ['cliente_id'], { name: 'veiculos_cliente_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('veiculos');
  },
};
