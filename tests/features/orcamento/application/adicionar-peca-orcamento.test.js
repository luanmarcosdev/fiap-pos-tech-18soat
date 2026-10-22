const { AdicionarPecaOrcamento } = require('@src/features/orcamento/application/adicionar-peca-orcamento');
const { ConflictError, NotFoundError, UnprocessableError } = require('@src/shared/errors');
const { ORDEM_SERVICO_ID, buildOrcamento, buildOrcamentoServico, buildOrcamentoPeca } = require('../orcamento.fixtures');

// visão devolvida pelo slice pecas (getById)
const peca = {
  id: '9f8e7d6c-5b4a-4321-8fed-cba987654321',
  nome: 'Filtro de óleo',
  preco_unitario: 39.9,
  quantidade_estoque: 0,
};

const setup = ({ stored = buildOrcamento(), getPecaById = jest.fn().mockResolvedValue(peca) } = {}) => {
  const orcamentosRepository = {
    // simula a transação: entrega o orçamento atual para o callback e devolve o que seria gravado
    addPeca: jest.fn(async (ordemServicoId, change) => {
      const { item, valor_total } = await change(stored);
      return { ...stored, valor_total, pecas: [...stored.pecas, item] };
    }),
  };
  const useCase = new AdicionarPecaOrcamento({ orcamentosRepository, getPecaById });
  return { useCase, orcamentosRepository, getPecaById };
};

describe('AdicionarPecaOrcamento', () => {
  it('inclui a peça com a quantidade e o preço do catálogo, sem exigir estoque', async () => {
    const servico = buildOrcamentoServico({ valor_unitario: 100 });
    const { useCase, orcamentosRepository, getPecaById } = setup({ stored: buildOrcamento({ servicos: [servico] }) });

    const result = await useCase.execute(ORDEM_SERVICO_ID, peca.id, 3);

    expect(getPecaById).toHaveBeenCalledWith(peca.id);
    expect(orcamentosRepository.addPeca).toHaveBeenCalledWith(ORDEM_SERVICO_ID, expect.any(Function));
    expect(result).toMatchObject({
      valor_total: 219.7,
      pecas: [{ peca_id: peca.id, quantidade: 3, valor_unitario: 39.9 }],
    });
  });

  it('gera UnprocessableError sem tocar no orçamento quando a peça não existe', async () => {
    const { useCase, orcamentosRepository } = setup({
      getPecaById: jest.fn().mockRejectedValue(new NotFoundError('Peça não encontrada')),
    });

    await expect(useCase.execute(ORDEM_SERVICO_ID, peca.id, 1)).rejects.toThrow(
      new UnprocessableError('Peça/insumo não encontrado'),
    );
    expect(orcamentosRepository.addPeca).not.toHaveBeenCalled();
  });

  it('propaga outros erros do slice pecas', async () => {
    const { useCase } = setup({ getPecaById: jest.fn().mockRejectedValue(new Error('conexão perdida')) });

    await expect(useCase.execute(ORDEM_SERVICO_ID, peca.id, 1)).rejects.toThrow('conexão perdida');
  });

  it('propaga a regra do domínio (peça repetida)', async () => {
    const { useCase } = setup({ stored: buildOrcamento({ pecas: [buildOrcamentoPeca()] }) });

    await expect(useCase.execute(ORDEM_SERVICO_ID, peca.id, 1)).rejects.toThrow(ConflictError);
  });
});
