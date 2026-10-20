'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ordens_servico', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      // número curto para o cliente consultar a OS, já que o id é um UUID
      numero: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, unique: true },
      cliente_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      veiculo_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'veiculos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      queixa: { type: Sequelize.TEXT, allowNull: false },
      diagnostico: { type: Sequelize.TEXT, allowNull: true },
      // "Status da OS Alterado para ..." do event storming; FINALIZADA também encerra a OS com orçamento reprovado ou expirado
      status: {
        type: Sequelize.ENUM(
          'RECEBIDA',
          'EM_DIAGNOSTICO',
          'AGUARDANDO_APROVACAO',
          'EM_EXECUCAO',
          'FINALIZADA',
          'ENTREGUE',
        ),
        allowNull: false,
        defaultValue: 'RECEBIDA',
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

    await queryInterface.addIndex('ordens_servico', ['cliente_id'], { name: 'ordens_servico_cliente_id_idx' });
    await queryInterface.addIndex('ordens_servico', ['veiculo_id'], { name: 'ordens_servico_veiculo_id_idx' });
    await queryInterface.addIndex('ordens_servico', ['status'], { name: 'ordens_servico_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ordens_servico');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ordens_servico_status";');
  },
};
