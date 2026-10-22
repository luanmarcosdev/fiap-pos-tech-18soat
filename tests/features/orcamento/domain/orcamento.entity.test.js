const { Orcamento, STATUS } = require('@src/features/orcamento/domain/orcamento.entity');
const { ConflictError } = require('@src/shared/errors');
const { buildOrcamento, buildOrcamentoServico } = require('../orcamento.fixtures');

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

  it('começa sem serviços quando a lista não é informada', () => {
    expect(new Orcamento({ id: 'o1', status: STATUS.EM_DIAGNOSTICO }).valorTotal).toBe(0);
  });

  describe('adicionarServico', () => {
    it('copia o preço do catálogo e atualiza o total', () => {
      const o = orcamento({ servicos: [buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 80.2 })] });

      const item = o.adicionarServico({ ...servico, preco: 150.5 });

      expect(item).toEqual({ servico_id: servico.id, valor_unitario: 150.5 });
      expect(o.valorTotal).toBe(230.7);
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
});
