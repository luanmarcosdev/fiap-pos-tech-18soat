const { AdicionarServico } = require('@src/features/ordem-servico/application/adicionar-servico');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const SERVICO_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';
const orcamento = { id: 'orcamento', status: 'EM_DIAGNOSTICO', valor_total: 120, servicos: [] };

const setup = (stored = buildOrdemServico({ status: 'EM_DIAGNOSTICO' })) => {
  const ordensServicoRepository = { findById: jest.fn().mockResolvedValue(stored) };
  const adicionarServicoOrcamento = jest.fn().mockResolvedValue(orcamento);
  const useCase = new AdicionarServico({ ordensServicoRepository, adicionarServicoOrcamento });
  return { useCase, ordensServicoRepository, adicionarServicoOrcamento };
};

describe('AdicionarServico', () => {
  it('inclui o serviço no orçamento da OS em diagnóstico e devolve o orçamento', async () => {
    const { useCase, ordensServicoRepository, adicionarServicoOrcamento } = setup();
    const { id } = buildOrdemServico();

    await expect(useCase.execute(id, SERVICO_ID)).resolves.toEqual(orcamento);
    expect(ordensServicoRepository.findById).toHaveBeenCalledWith(id);
    expect(adicionarServicoOrcamento).toHaveBeenCalledWith(id, SERVICO_ID);
  });

  it('gera NotFoundError quando a OS não existe', async () => {
    const { useCase, adicionarServicoOrcamento } = setup(null);

    await expect(useCase.execute('id', SERVICO_ID)).rejects.toThrow(
      new NotFoundError('Ordem de serviço não encontrada'),
    );
    expect(adicionarServicoOrcamento).not.toHaveBeenCalled();
  });

  it('gera ConflictError sem tocar no orçamento quando a OS não está em diagnóstico', async () => {
    const { useCase, adicionarServicoOrcamento } = setup(buildOrdemServico({ status: 'RECEBIDA' }));

    await expect(useCase.execute('id', SERVICO_ID)).rejects.toThrow(ConflictError);
    expect(adicionarServicoOrcamento).not.toHaveBeenCalled();
  });
});
