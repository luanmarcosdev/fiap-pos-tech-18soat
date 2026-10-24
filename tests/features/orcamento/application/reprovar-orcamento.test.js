const { ReprovarOrcamento } = require('@src/features/orcamento/application/reprovar-orcamento');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { ORDEM_SERVICO_ID, buildOrcamento } = require('../orcamento.fixtures');

const agora = new Date('2026-10-24T13:00:00.000Z');
const enviado = buildOrcamento({ status: 'ENVIADO', expira_em: '2026-11-05T13:00:00.000Z' });
const osFinalizada = { id: ORDEM_SERVICO_ID, status: 'FINALIZADA' };

const setup = (stored = enviado) => {
  const orcamentosRepository = {
    // simula a transação: entrega o orçamento atual para o callback e devolve o que seria gravado
    updateWithLockById: jest.fn(async (id, change) => (stored ? { ...stored, ...(await change(stored)) } : null)),
  };
  const finalizarOrdemServico = jest.fn().mockResolvedValue(osFinalizada);
  const useCase = new ReprovarOrcamento({ orcamentosRepository, finalizarOrdemServico, agora: () => agora });
  return { useCase, orcamentosRepository, finalizarOrdemServico };
};

describe('ReprovarOrcamento', () => {
  it('reprova o orçamento e finaliza a OS', async () => {
    const { useCase, orcamentosRepository, finalizarOrdemServico } = setup();

    const result = await useCase.execute(enviado.id);

    expect(orcamentosRepository.updateWithLockById).toHaveBeenCalledWith(enviado.id, expect.any(Function));
    expect(finalizarOrdemServico).toHaveBeenCalledWith(ORDEM_SERVICO_ID);
    expect(result).toEqual({ orcamento: { ...enviado, status: 'REPROVADO' }, ordem_servico: osFinalizada });
  });

  it('já reprovado (retomada): finaliza a OS de novo', async () => {
    const { useCase, finalizarOrdemServico } = setup({ ...enviado, status: 'REPROVADO' });

    await useCase.execute(enviado.id);

    expect(finalizarOrdemServico).toHaveBeenCalledWith(ORDEM_SERVICO_ID);
  });

  it('gera NotFoundError sem finalizar a OS', async () => {
    const { useCase, finalizarOrdemServico } = setup(null);

    await expect(useCase.execute('id')).rejects.toThrow(new NotFoundError('Orçamento não encontrado'));
    expect(finalizarOrdemServico).not.toHaveBeenCalled();
  });

  it('gera ConflictError sem finalizar a OS quando o orçamento já foi aprovado', async () => {
    const { useCase, finalizarOrdemServico } = setup({ ...enviado, status: 'APROVADO' });

    await expect(useCase.execute('id')).rejects.toThrow(ConflictError);
    expect(finalizarOrdemServico).not.toHaveBeenCalled();
  });
});
