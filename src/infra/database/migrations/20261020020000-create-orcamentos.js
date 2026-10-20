'use strict';

/**
 * Um orçamento por OS. Ele nasce no início do diagnóstico (EM_DIAGNOSTICO), recebe os serviços e
 * peças/insumos e, ao concluir o diagnóstico, é gerado e enviado ao cliente de uma vez (ENVIADO).
 *
 * A reserva de peças é derivada do status, sem coluna própria:
 * ENVIADO = reservada, APROVADO = estoque baixado, REPROVADO/EXPIRADO = reserva cancelada.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orcamentos', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      ordem_servico_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'ordens_servico', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('EM_DIAGNOSTICO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'EXPIRADO'),
        allowNull: false,
        defaultValue: 'EM_DIAGNOSTICO',
      },
      valor_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      // definido quando o orçamento é enviado; a policy "Expirar Orçamento" compara com ele
      expira_em: { type: Sequelize.DATE, allowNull: true },
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

    await queryInterface.sequelize.query(`
      ALTER TABLE orcamentos ADD CONSTRAINT orcamentos_valor_total_check CHECK (valor_total >= 0);

      -- os enviados são os que seguram reserva de peça e os que podem expirar
      CREATE INDEX orcamentos_enviados_expira_em_idx ON orcamentos (expira_em) WHERE status = 'ENVIADO';
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orcamentos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orcamentos_status";');
  },
};
