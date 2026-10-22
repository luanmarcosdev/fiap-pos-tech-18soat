const { Orcamento, STATUS } = require('@src/features/orcamento/domain/orcamento.entity');
const { ConflictError, UnprocessableError, ValidationError } = require('@src/shared/errors');

const LIMITE = new UnprocessableError('O item faria o valor total do orçamento passar do limite permitido');
const { buildOrcamento, buildOrcamentoServico, buildOrcamentoPeca } = require('../orcamento.fixtures');

const orcamento = (overrides = {}) => new Orcamento(buildOrcamento(overrides));
const servico = { id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', preco: 120 };

describe('Orcamento', () => {
  it('recusa status desconhecido', () => {
    expect(() => orcamento({ status: 'AGUARDANDO_APROVACAO' })).toThrow('Status inválido');
  });

  it('valorTotal soma os serviços em centavos', () => {
    const o = orcamento({
      servicos: [
        buildOrcamentoServico({ valor_unitario: 0.1 }),
        buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 0.2 }),
      ],
    });

    expect(o.valorTotal).toBe(0.3);
    expect(orcamento().valorTotal).toBe(0);
  });

  it('valorTotal soma serviços e peças × quantidade, em centavos', () => {
    const o = orcamento({
      servicos: [buildOrcamentoServico({ valor_unitario: 100 })],
      pecas: [
        buildOrcamentoPeca({ quantidade: 3, valor_unitario: 0.1 }),
        buildOrcamentoPeca({ peca_id: 'outra', quantidade: 2, valor_unitario: 39.9 }),
      ],
    });

    expect(o.valorTotal).toBe(180.1);
  });

  it('começa sem itens quando as listas não são informadas', () => {
    expect(new Orcamento({ id: 'o1', status: STATUS.EM_DIAGNOSTICO }).valorTotal).toBe(0);
  });

  describe('adicionarServico', () => {
    it('copia o preço do catálogo e atualiza o total', () => {
      const o = orcamento({ servicos: [buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 80.2 })] });

      const item = o.adicionarServico({ ...servico, preco: 150.5 });

      expect(item).toEqual({ servico_id: servico.id, valor_unitario: 150.5 });
      expect(o.valorTotal).toBe(230.7);
    });

    it('gera UnprocessableError, sem incluir o serviço, quando o total passaria do limite', () => {
      const o = orcamento({ servicos: [buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 99999999.99 })] });

      expect(() => o.adicionarServico({ ...servico, preco: 0.01 })).toThrow(LIMITE);
      expect(o.valorTotal).toBe(99999999.99);
    });

    it('gera ConflictError com serviço repetido', () => {
      const o = orcamento({ servicos: [buildOrcamentoServico({ servico_id: servico.id })] });

      expect(() => o.adicionarServico(servico)).toThrow(new ConflictError('Serviço já adicionado ao orçamento'));
    });

    it.each(Object.values(STATUS).filter((status) => status !== STATUS.EM_DIAGNOSTICO))(
      'gera ConflictError com o orçamento em %s',
      (status) => {
        expect(() => orcamento({ status }).adicionarServico(servico)).toThrow(
          new ConflictError('O orçamento já foi gerado e não aceita novos itens'),
        );
      },
    );
  });

  describe('adicionarPeca', () => {
    const peca = { id: '9f8e7d6c-5b4a-4321-8fed-cba987654321', preco_unitario: 39.9, quantidade_estoque: 0 };

    it('copia o preço do catálogo com a quantidade, mesmo sem estoque', () => {
      const o = orcamento();

      const item = o.adicionarPeca(peca, 2);

      expect(item).toEqual({ peca_id: peca.id, quantidade: 2, valor_unitario: 39.9 });
      expect(o.valorTotal).toBe(79.8);
    });

    it.each([0, -1, 1.5, '2', undefined])('gera ValidationError com quantidade %p', (quantidade) => {
      expect(() => orcamento().adicionarPeca(peca, quantidade)).toThrow(ValidationError);
    });

    it('aceita chegar exatamente ao limite do valor total (DECIMAL(10,2))', () => {
      const o = orcamento({ servicos: [buildOrcamentoServico({ valor_unitario: 99999999.98 })] });

      o.adicionarPeca({ ...peca, preco_unitario: 0.01 }, 1);

      expect(o.valorTotal).toBe(99999999.99);
    });

    it('gera UnprocessableError, sem incluir a peça, quando o total passaria do limite', () => {
      const o = orcamento({ servicos: [buildOrcamentoServico({ valor_unitario: 100 })] });

      expect(() => o.adicionarPeca({ ...peca, preco_unitario: 10000 }, 10000)).toThrow(LIMITE);
      expect(o.valorTotal).toBe(100);
      // a peça recusada não fica na lista: pode ser adicionada de novo com outra quantidade
      expect(o.adicionarPeca({ ...peca, preco_unitario: 10000 }, 1)).toMatchObject({ quantidade: 1 });
    });

    it('gera ConflictError com peça repetida', () => {
      const o = orcamento({ pecas: [buildOrcamentoPeca({ peca_id: peca.id })] });

      expect(() => o.adicionarPeca(peca, 1)).toThrow(new ConflictError('Peça/insumo já adicionado ao orçamento'));
    });

    it('gera ConflictError com o orçamento já gerado', () => {
      expect(() => orcamento({ status: STATUS.ENVIADO }).adicionarPeca(peca, 1)).toThrow(
        new ConflictError('O orçamento já foi gerado e não aceita novos itens'),
      );
    });
  });
});
