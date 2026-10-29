'use strict';

/**
 * Histórico de status da OS: uma linha a cada mudança, gravada na mesma transação da mudança. É a base do
 * "monitoramento do tempo médio de execução". OS anteriores a esta migration não ganham linhas retroativas:
 * as datas das etapas intermediárias não existem, e inventá-las distorceria a média.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'ordens_servico_historico',
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          ordem_servico_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'ordens_servico', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          // null na criação da OS
          status_anterior: { type: Sequelize.STRING(30), allowNull: true },
          status: { type: Sequelize.STRING(30), allowNull: false },
          alterado_em: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          // ordem de gravação: desempata duas mudanças da mesma OS com o mesmo alterado_em
          sequencia: { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true },
        },
        { transaction },
      );

      // texto com CHECK para não depender do enum da tabela ordens_servico
      await queryInterface.sequelize.query(
        `
        ALTER TABLE ordens_servico_historico
          ADD CONSTRAINT ordens_servico_historico_status_check CHECK (status IN
            ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE')),
          ADD CONSTRAINT ordens_servico_historico_status_anterior_check CHECK (status_anterior IN
            ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE')),
          ADD CONSTRAINT ordens_servico_historico_mudanca_check CHECK (status_anterior IS DISTINCT FROM status);

        -- etapas de cada OS em ordem (tempo em cada status) e entregas por período (tempo total)
        CREATE INDEX ordens_servico_historico_os_idx ON ordens_servico_historico (ordem_servico_id, alterado_em);
        CREATE INDEX ordens_servico_historico_status_idx ON ordens_servico_historico (status, alterado_em);
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ordens_servico_historico');
  },
};
