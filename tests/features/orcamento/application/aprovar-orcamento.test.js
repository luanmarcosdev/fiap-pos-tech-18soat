const { AprovarOrcamento } = require('@src/features/orcamento/application/aprovar-orcamento');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildOrcamento, buildOrcamentoPeca } = require('../orcamento.fixtures');

const agora = new Date('2026-10-24T13:00:00.000Z');
const enviado = buildOrcamento({
  status: 'ENVIADO',
  expira_em: '2026-11-05T13:00:00.000Z',
  pecas: [buildOrcamentoPeca({ id: 'item-1', estoque_baixado: null })],
});

const setup = (stored = enviado) => {
  const orcamentosRepository = {
    // simula a transação: entrega o orçamento atual para o callback e devolve o que seria gravado
    updateWithLockById: jest.fn(async (id, change) => (stored ? { ...stored, ...(await change(stored)) } : null)),
  };
  const baixarEstoque = { execute: jest.fn(async (orcamento) => ({ ...orcamento, baixado: true })) };
  const useCase = new AprovarOrcamento({ orcamentosRepository, baixarEstoque, agora: () => agora });
  return { useCase, orcamentosRepository, baixarEstoque };
};

describe('AprovarOrcamento', () => {
  it('aprova o orçamento e devolve o resultado da baixa de estoque', async () => {
    const { useCase, orcamentosRepository, baixarEstoque } = setup();

    const result = await useCase.execute(enviado.id);

    expect(orcamentosRepository.updateWithLockById).toHaveBeenCalledWith(enviado.id, expect.any(Function));
    expect(baixarEstoque.execute).toHaveBeenCalledWith({ ...enviado, status: 'APROVADO' });
    expect(result).toMatchObject({ status: 'APROVADO', baixado: true });
  });

  it('já aprovado (retomada): baixa de novo as peças pendentes', async () => {
    const { useCase, baixarEstoque } = setup({ ...enviado, status: 'APROVADO' });

    await useCase.execute(enviado.id);

    expect(baixarEstoque.execute).toHaveBeenCalledWith(expect.objectContaining({ status: 'APROVADO' }));
  });

  it('gera NotFoundError sem baixar estoque', async () => {
    const { useCase, baixarEstoque } = setup(null);

    await expect(useCase.execute('id')).rejects.toThrow(new NotFoundError('Orçamento não encontrado'));
    expect(baixarEstoque.execute).not.toHaveBeenCalled();
  });

  it('gera ConflictError sem baixar estoque quando o orçamento passou da validade', async () => {
    const { useCase, baixarEstoque } = setup({ ...enviado, expira_em: '2026-10-20T00:00:00.000Z' });

    await expect(useCase.execute('id')).rejects.toThrow(ConflictError);
    expect(baixarEstoque.execute).not.toHaveBeenCalled();
  });
});
