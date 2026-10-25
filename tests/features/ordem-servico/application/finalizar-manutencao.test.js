const { FinalizarManutencao } = require('@src/features/ordem-servico/application/finalizar-manutencao');
const { NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico({ status: 'EM_EXECUCAO' });

const setup = ({ stored = os } = {}) => {
  const deps = {
    ordensServicoRepository: {
      updateWithLock: jest.fn().mockImplementation(async (id, callback) => {
        if (!stored) return null;
        const resultData = callback(stored);
        return { ...stored, ...resultData };
      }),
    },
  };
  return { useCase: new FinalizarManutencao(deps), ...deps };
};

describe('FinalizarManutencao', () => {
  it('atualiza o status da OS para FINALIZADA com sucesso', async () => {
    const { useCase, ordensServicoRepository } = setup();

    const result = await useCase.execute(os.id);

    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledTimes(1);
    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledWith(os.id, expect.any(Function));
    expect(result).toEqual({
      ...os,
      status: 'FINALIZADA',
    });
  });

  it('gera NotFoundError quando a ordem de serviço não é encontrada', async () => {
    const { useCase, ordensServicoRepository } = setup({ stored: null });

    await expect(useCase.execute(os.id)).rejects.toThrow(
      new NotFoundError('Ordem de serviço não encontrada')
    );
    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledTimes(1);
  });

  it('propaga erro de domínio se o status atual não permitir finalizar a manutenção', async () => {
    const invalidOs = buildOrdemServico({ status: 'RECEBIDA' });
    const { useCase } = setup({ stored: invalidOs });

    await expect(useCase.execute(invalidOs.id)).rejects.toThrow();
  });
});