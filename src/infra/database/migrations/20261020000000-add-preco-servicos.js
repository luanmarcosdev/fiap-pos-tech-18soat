'use strict';

/**
 * Preço de tabela do serviço. O orçamento copia o valor para o item no momento em que o serviço
 * é adicionado, então alterar o preço aqui não muda orçamentos já feitos.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // default 0 só para preencher os serviços já cadastrados; o DTO exige o preço nos novos
    await queryInterface.addColumn('servicos', 'preco', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE servicos ADD CONSTRAINT servicos_preco_check CHECK (preco >= 0);',
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('servicos', 'preco');
  },
};
