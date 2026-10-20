'use strict';

/**
 * Serviços e peças/insumos do orçamento. valor_unitario é uma cópia do preço do catálogo no momento
 * em que o item foi adicionado, para que mudar o catálogo não altere um orçamento já feito.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
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
    };
    const orcamentoId = {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'orcamentos', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    };

    await queryInterface.createTable('orcamento_servicos', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      orcamento_id: orcamentoId,
      servico_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'servicos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      valor_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('orcamento_pecas', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      orcamento_id: orcamentoId,
      peca_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'pecas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantidade: { type: Sequelize.INTEGER, allowNull: false },
      valor_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      ...timestamps,
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE orcamento_servicos
        ADD CONSTRAINT orcamento_servicos_valor_unitario_check CHECK (valor_unitario >= 0),
        ADD CONSTRAINT orcamento_servicos_unique UNIQUE (orcamento_id, servico_id);

      ALTER TABLE orcamento_pecas
        ADD CONSTRAINT orcamento_pecas_quantidade_check CHECK (quantidade > 0),
        ADD CONSTRAINT orcamento_pecas_valor_unitario_check CHECK (valor_unitario >= 0),
        ADD CONSTRAINT orcamento_pecas_unique UNIQUE (orcamento_id, peca_id);

      -- soma das reservas por peça (itens de orçamentos ENVIADO)
      CREATE INDEX orcamento_pecas_peca_id_idx ON orcamento_pecas (peca_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orcamento_pecas');
    await queryInterface.dropTable('orcamento_servicos');
  },
};
