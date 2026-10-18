const { Peca } = require('@src/features/pecas/domain/peca.entity');
const { ConflictError, ValidationError } = require('@src/shared/errors');

const peca = (stock = {}) => new Peca({ id: 'p1', quantidade_estoque: 10, estoque_minimo: 2, ...stock });

describe('Peca', () => {
  it('indica quando o estoque está abaixo ou no mínimo', () => {
    expect(peca().abaixoDoMinimo).toBe(false);
    expect(peca({ quantidade_estoque: 2 }).abaixoDoMinimo).toBe(true);
    expect(peca({ quantidade_estoque: 0 }).abaixoDoMinimo).toBe(true);
  });

  it('usa zero como padrão e expõe id e estoque', () => {
    const p = new Peca({ id: 'p1' });

    expect(p.toStock()).toEqual({ quantidade_estoque: 0 });
    expect(p.id).toBe('p1');
    expect(peca().quantidadeEstoque).toBe(10);
  });

  it('recusa estoque negativo', () => {
    expect(() => peca({ quantidade_estoque: -1 })).toThrow('Estado de estoque inconsistente');
  });

  it('hasStock (Verificar Estoque) compara com o estoque atual', () => {
    expect(peca().hasStock(10)).toBe(true);
    expect(peca().hasStock(11)).toBe(false);
  });

  it('registerEntry (Peça/Insumo Adquirido) soma ao estoque', () => {
    const p = peca();
    p.registerEntry(5);

    expect(p.toStock()).toEqual({ quantidade_estoque: 15 });
  });

  describe('consume (Baixar Estoque)', () => {
    it('desconta do estoque, inclusive até zerar', () => {
      const p = peca();
      p.consume(4);
      expect(p.quantidadeEstoque).toBe(6);

      p.consume(6);
      expect(p.quantidadeEstoque).toBe(0);
    });

    it('gera ConflictError acima do estoque', () => {
      const p = peca();

      expect(() => p.consume(11)).toThrow(new ConflictError('Estoque insuficiente'));
      expect(p.quantidadeEstoque).toBe(10);
    });
  });

  it.each([0, -1, 1.5, '2', undefined])('recusa quantidade inválida %p em todas as operações', (quantidade) => {
    for (const operation of ['hasStock', 'registerEntry', 'consume']) {
      expect(() => peca()[operation](quantidade)).toThrow(ValidationError);
    }
  });
});
