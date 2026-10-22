'use strict';

/**
 * Descrição do catálogo copiada para os itens do orçamento, como já acontece com o preço: o orçamento continua
 * legível para cliente, atendente e mecânico mesmo que o serviço ou a peça/insumo seja renomeado ou removido
 * do catálogo (soft delete).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // numa transação: se o preenchimento falhar, as colunas não ficam criadas pela metade
    await queryInterface.sequelize.transaction(async (transaction) => {
      const coluna = (tabela, nome, type) => queryInterface.addColumn(tabela, nome, { type }, { transaction });
      await coluna('orcamento_servicos', 'nome', Sequelize.STRING(120));
      await coluna('orcamento_pecas', 'codigo', Sequelize.STRING(30));
      await coluna('orcamento_pecas', 'nome', Sequelize.STRING(120));
      await coluna('orcamento_pecas', 'tipo', Sequelize.STRING(10));
      await coluna('orcamento_pecas', 'unidade_medida', Sequelize.STRING(10));

      // itens já gravados recebem a descrição atual do catálogo (inclusive de itens removidos); depois ela vira
      // obrigatória. tipo é texto com CHECK para não depender do enum da tabela pecas
      await queryInterface.sequelize.query(
        `
        UPDATE orcamento_servicos i SET nome = s.nome FROM servicos s WHERE s.id = i.servico_id;
        UPDATE orcamento_pecas i
          SET codigo = p.codigo, nome = p.nome, tipo = p.tipo::text, unidade_medida = p.unidade_medida
          FROM pecas p WHERE p.id = i.peca_id;

        ALTER TABLE orcamento_servicos ALTER COLUMN nome SET NOT NULL;
        ALTER TABLE orcamento_pecas
          ALTER COLUMN codigo SET NOT NULL,
          ALTER COLUMN nome SET NOT NULL,
          ALTER COLUMN tipo SET NOT NULL,
          ALTER COLUMN unidade_medida SET NOT NULL,
          ADD CONSTRAINT orcamento_pecas_tipo_check CHECK (tipo IN ('PECA', 'INSUMO'));
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const coluna of ['unidade_medida', 'tipo', 'nome', 'codigo']) {
        await queryInterface.removeColumn('orcamento_pecas', coluna, { transaction });
      }
      await queryInterface.removeColumn('orcamento_servicos', 'nome', { transaction });
    });
  },
};
