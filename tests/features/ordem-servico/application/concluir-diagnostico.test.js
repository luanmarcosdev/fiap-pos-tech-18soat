const { ConcluirDiagnostico } = require('@src/features/ordem-servico/application/concluir-diagnostico');
const { ConflictError, NotFoundError, UnprocessableError, ValidationError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const orcamento = { id: 'orcamento', status: 'ENVIADO', valor_total: 150, expira_em: '2026-11-05', pecas: [] };

const setup = ({ lida = buildOrdemServico({ status: 'EM_DIAGNOSTICO' }), travada = lida } = {}) => {
  const ordensServicoRepository = {
    findById: jest.fn().mockResolvedValue(lida),
    // simula a transação: entrega o estado atual para o callback e grava o resultado
    updateWithLock: jest.fn(async (id, change) => (travada ? { ...travada, ...(await change(travada)) } : null)),
  };
  const gerarOrcamento = jest.fn().mockResolvedValue(orcamento);
  const notificarCliente = { execute: jest.fn() };
  const useCase = new ConcluirDiagnostico({ ordensServicoRepository, gerarOrcamento, notificarCliente });
  return { useCase, ordensServicoRepository, gerarOrcamento, notificarCliente };
};

describe('ConcluirDiagnostico', () => {
  it('gera o orçamento, coloca a OS aguardando aprovação e notifica o cliente com o orçamento', async () => {
    const { useCase, gerarOrcamento, notificarCliente } = setup();
    const os = buildOrdemServico();

    const result = await useCase.execute(os.id, { diagnostico: ' Pastilhas gastas ' });

    expect(gerarOrcamento).toHaveBeenCalledWith(os.id);
    expect(result).toEqual({
      ordem_servico: { ...os, status: 'AGUARDANDO_APROVACAO', diagnostico: 'Pastilhas gastas' },
      orcamento,
    });
    expect(notificarCliente.execute).toHaveBeenCalledWith({
      tipo: 'DiagnosticoConcluido',
      ordemServicoId: os.id,
      numero: os.numero,
      clienteId: os.cliente_id,
      orcamento,
    });
  });

  it('gera o orçamento antes de mudar a OS', async () => {
    const { useCase, ordensServicoRepository, gerarOrcamento } = setup();

    await useCase.execute('id', { diagnostico: 'ok' });

    expect(gerarOrcamento.mock.invocationCallOrder[0]).toBeLessThan(
      ordensServicoRepository.updateWithLock.mock.invocationCallOrder[0],
    );
  });

  it('gera NotFoundError sem gerar orçamento quando a OS não existe', async () => {
    const { useCase, gerarOrcamento } = setup({ lida: null });

    await expect(useCase.execute('id', { diagnostico: 'ok' })).rejects.toThrow(
      new NotFoundError('Ordem de serviço não encontrada'),
    );
    expect(gerarOrcamento).not.toHaveBeenCalled();
  });

  it('gera ConflictError sem gerar orçamento quando a OS não está em diagnóstico', async () => {
    const { useCase, gerarOrcamento, notificarCliente } = setup({ lida: buildOrdemServico({ status: 'RECEBIDA' }) });

    await expect(useCase.execute('id', { diagnostico: 'ok' })).rejects.toThrow(ConflictError);
    expect(gerarOrcamento).not.toHaveBeenCalled();
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('gera ValidationError sem gerar orçamento quando o diagnóstico está vazio', async () => {
    const { useCase, gerarOrcamento } = setup();

    await expect(useCase.execute('id', { diagnostico: '   ' })).rejects.toThrow(ValidationError);
    expect(gerarOrcamento).not.toHaveBeenCalled();
  });

  it('propaga o erro do orçamento (sem itens) sem mudar a OS nem notificar', async () => {
    const { useCase, ordensServicoRepository, gerarOrcamento, notificarCliente } = setup();
    gerarOrcamento.mockRejectedValue(new UnprocessableError('Adicione ao menos um serviço'));

    await expect(useCase.execute('id', { diagnostico: 'ok' })).rejects.toThrow(UnprocessableError);
    expect(ordensServicoRepository.updateWithLock).not.toHaveBeenCalled();
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('conclusão concorrente: a segunda recebe ConflictError ao travar a OS e não notifica', async () => {
    const { useCase, notificarCliente } = setup({
      travada: buildOrdemServico({ status: 'AGUARDANDO_APROVACAO' }),
    });

    await expect(useCase.execute('id', { diagnostico: 'ok' })).rejects.toThrow(ConflictError);
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('gera NotFoundError se a OS sumir entre a leitura e o lock', async () => {
    const { useCase } = setup({ travada: null });

    await expect(useCase.execute('id', { diagnostico: 'ok' })).rejects.toThrow(NotFoundError);
  });
});
