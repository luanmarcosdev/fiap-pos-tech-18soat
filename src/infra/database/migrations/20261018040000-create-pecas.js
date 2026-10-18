'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pecas', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      codigo: { type: Sequelize.STRING(30), allowNull: false },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      tipo: { type: Sequelize.ENUM('PECA', 'INSUMO'), allowNull: false },
      unidade_medida: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'UN' },
      preco_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      quantidade_estoque: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estoque_minimo: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
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

    // as regras de estoque ficam na entidade Peca; os CHECKs são a última barreira
    await queryInterface.sequelize.query(`
      ALTER TABLE pecas
        ADD CONSTRAINT pecas_preco_unitario_check CHECK (preco_unitario >= 0),
        ADD CONSTRAINT pecas_quantidade_estoque_check CHECK (quantidade_estoque >= 0),
        ADD CONSTRAINT pecas_estoque_minimo_check CHECK (estoque_minimo >= 0);

      CREATE UNIQUE INDEX pecas_codigo_unique ON pecas (codigo) WHERE deleted_at IS NULL;
      -- f_unaccent vem da migration add-accent-insensitive-search
      CREATE INDEX pecas_nome_trgm_idx ON pecas USING gin (f_unaccent(nome) gin_trgm_ops);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pecas');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pecas_tipo";');
  },
};
