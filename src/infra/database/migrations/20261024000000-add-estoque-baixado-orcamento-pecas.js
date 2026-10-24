'use strict';

/**
 * Resultado da policy "Baixar Estoque" em cada peça/insumo do orçamento aprovado:
 * null = ainda não aprovado, true = baixado do estoque, false = sem estoque, a adquirir pelo sistema externo.
 * Gravar por item permite repetir a aprovação depois de uma falha sem baixar o estoque duas vezes.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orcamento_pecas', 'estoque_baixado', { type: Sequelize.BOOLEAN, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orcamento_pecas', 'estoque_baixado');
  },
};
