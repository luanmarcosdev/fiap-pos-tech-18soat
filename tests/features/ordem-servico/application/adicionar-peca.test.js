const { AdicionarPeca } = require('@src/features/ordem-servico/application/adicionar-peca');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const PECA_ID = '9f8e7d6c-5b4a-4321-8fed-cba987654321';
const orcamento = { id: 'orcamento', status: 'EM_DIAGNOSTICO', valor_total: 79.8, servicos: [], pecas: [] };

const setup = (stored = buildOrdemServico({ status: 'EM_DIAGNOSTICO' })) => {
  const ordensServicoRepository = { findById: jest.fn().mockResolvedValue(stored) };
  const adicionarPecaOrcamento = jest.fn().mockResolvedValue(orcamento);
  const useCase = new AdicionarPeca({ ordensServicoRepository, adicionarPecaOrcamento });
  return { useCase, ordensServicoRepository, adicionarPecaOrcamento };
};

describe('AdicionarPeca', () => {
  it('inclui a peça/insumo no orçamento da OS em diagnóstico e devolve o orçamento', async () => {
    const { useCase, ordensServicoRepository, adicionarPecaOrcamento } = setup();
    const { id } = buildOrdemServico();

    await expect(useCase.execute(id, { peca_id: PECA_ID, quantidade: 2 })).resolves.toEqual(orcamento);
    expect(ordensServicoRepository.findById).toHaveBeenCalledWith(id);
    expect(adicionarPecaOrcamento).toHaveBeenCalledWith(id, PECA_ID, 2);
  });

  it('gera NotFoundError quando a OS não existe', async () => {
    const { useCase, adicionarPecaOrcamento } = setup(null);

    await expect(useCase.execute('id', { peca_id: PECA_ID, quantidade: 2 })).rejects.toThrow(
      new NotFoundError('Ordem de serviço não encontrada'),
    );
    expect(adicionarPecaOrcamento).not.toHaveBeenCalled();
  });

  it('gera ConflictError sem tocar no orçamento quando a OS não está em diagnóstico', async () => {
    const { useCase, adicionarPecaOrcamento } = setup(buildOrdemServico({ status: 'AGUARDANDO_APROVACAO' }));

    await expect(useCase.execute('id', { peca_id: PECA_ID, quantidade: 2 })).rejects.toThrow(ConflictError);
    expect(adicionarPecaOrcamento).not.toHaveBeenCalled();
  });
});
