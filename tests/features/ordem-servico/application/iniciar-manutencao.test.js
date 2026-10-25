const { IniciarManutencao } = require('@src/features/ordem-servico/application/iniciar-manutencao');
const { NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico({ status: 'AGUARDANDO_APROVACAO' });
const mockNotificacao = { id: 'notificacao-id' };

const setup = ({ stored = os } = {}) => {
  const deps = {
    ordensServicoRepository: {
      updateWithLock: jest.fn().mockImplementation(async (id, callback) => {
        if (!stored) return null;
        const resultData = callback(stored);
        return { ...stored, ...resultData };
      }),
    },
    notificarCliente: { execute: jest.fn().mockResolvedValue(mockNotificacao) },
  };
  return { useCase: new IniciarManutencao(deps), ...deps };
};

describe('IniciarManutencao', () => {
  it('atualiza o status da OS para EM_EXECUCAO e notifica o cliente com sucesso', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup();

    const result = await useCase.execute(os.id);

    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledTimes(1);
    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledWith(os.id, expect.any(Function));
    expect(notificarCliente.execute).toHaveBeenCalledTimes(1);
    expect(notificarCliente.execute).toHaveBeenCalledWith(expect.any(Object));
    expect(result).toEqual({
      ...os,
      status: 'EM_EXECUCAO',
    });
  });

  it('gera NotFoundError quando a ordem de serviço não é encontrada e não notifica o cliente', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup({ stored: null });

    await expect(useCase.execute(os.id)).rejects.toThrow(
      new NotFoundError('Ordem de serviço não encontrada')
    );
    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledTimes(1);
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('propaga erro de domínio se o status atual não permitir iniciar a manutenção', async () => {
    const invalidOs = buildOrdemServico({ status: 'RECEBIDA' });
    const { useCase, notificarCliente } = setup({ stored: invalidOs });

    await expect(useCase.execute(invalidOs.id)).rejects.toThrow();
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });
});