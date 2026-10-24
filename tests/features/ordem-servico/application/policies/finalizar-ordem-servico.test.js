const { FinalizarOrdemServico } = require('@src/features/ordem-servico/application/policies/finalizar-ordem-servico');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../../ordem-servico.fixtures');

const setup = (stored = buildOrdemServico({ status: 'AGUARDANDO_APROVACAO' })) => {
  const ordensServicoRepository = {
    // simula a transação: entrega o estado atual para o callback e grava o resultado
    updateWithLock: jest.fn(async (id, change) => (stored ? { ...stored, ...(await change(stored)) } : null)),
  };
  return { policy: new FinalizarOrdemServico({ ordensServicoRepository }), ordensServicoRepository };
};

describe('FinalizarOrdemServico', () => {
  it('finaliza a OS aguardando aprovação com a linha travada', async () => {
    const { policy, ordensServicoRepository } = setup();
    const os = buildOrdemServico();

    const result = await policy.execute(os.id);

    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledWith(os.id, expect.any(Function));
    expect(result).toMatchObject({ id: os.id, status: 'FINALIZADA' });
  });

  it('já finalizada, devolve a OS sem erro', async () => {
    const { policy } = setup(buildOrdemServico({ status: 'FINALIZADA' }));

    await expect(policy.execute('id')).resolves.toMatchObject({ status: 'FINALIZADA' });
  });

  it('gera NotFoundError quando a OS não existe', async () => {
    const { policy } = setup(null);

    await expect(policy.execute('id')).rejects.toThrow(new NotFoundError('Ordem de serviço não encontrada'));
  });

  it('gera ConflictError quando a OS não está aguardando aprovação', async () => {
    const { policy } = setup(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));

    await expect(policy.execute('id')).rejects.toThrow(ConflictError);
  });
});
