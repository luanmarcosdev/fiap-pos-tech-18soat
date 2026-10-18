const { ConflictError, ValidationError } = require('../../../shared/errors');

function validarQuantidade(quantidade) {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new ValidationError('Quantidade inválida', [
      { campo: 'quantidade', mensagem: 'Deve ser um número inteiro maior que zero' },
    ]);
  }
}

/**
 * Regras de estoque de uma peça/insumo, como no event storming:
 * - "Peça/Insumo Adquirido": entrada soma ao estoque
 * - "Verificar Estoque": antes de gerar o orçamento, confere se há quantidade suficiente
 * - "Baixar Estoque": quando o orçamento é aprovado, desconta do estoque
 */
class Peca {
  #id;
  #quantidadeEstoque;
  #estoqueMinimo;

  constructor({ id, quantidade_estoque = 0, estoque_minimo = 0 }) {
    if (quantidade_estoque < 0) throw new Error(`Estado de estoque inconsistente para a peça ${id}`);
    this.#id = id;
    this.#quantidadeEstoque = quantidade_estoque;
    this.#estoqueMinimo = estoque_minimo;
  }

  get id() {
    return this.#id;
  }

  get quantidadeEstoque() {
    return this.#quantidadeEstoque;
  }

  get abaixoDoMinimo() {
    return this.#quantidadeEstoque <= this.#estoqueMinimo;
  }

  temEstoque(quantidade) {
    validarQuantidade(quantidade);
    return quantidade <= this.#quantidadeEstoque;
  }

  registrarEntrada(quantidade) {
    validarQuantidade(quantidade);
    this.#quantidadeEstoque += quantidade;
  }

  baixarEstoque(quantidade) {
    if (!this.temEstoque(quantidade)) throw new ConflictError('Estoque insuficiente');
    this.#quantidadeEstoque -= quantidade;
  }

  /** Campos persistidos que as operações de estoque alteram. */
  toStock() {
    return { quantidade_estoque: this.#quantidadeEstoque };
  }
}

module.exports = { Peca };
