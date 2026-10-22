const { GerarOrcamento } = require('@src/features/orcamento/application/policies/gerar-orcamento');
const { ConflictError, UnprocessableError } = require('@src/shared/errors');
const { ORDEM_SERVICO_ID, buildOrcamento, buildOrcamentoServico } = require('../../orcamento.fixtures');

const agora = new Date('2026-10-22T13:00:00.000Z');

const setup = (stored = buildOrcamento({ servicos: [buildOrcamentoServico()] })) => {
  const orcamentosRepository = {
    // simula a transação: entrega o orçamento atual para o callback e devolve o que seria gravado
    updateWithLock: jest.fn(async (ordemServicoId, change) =>
      stored ? { ...stored, ...(await change(stored)) } : null,
    ),
  };
  const verificarEstoque = { execute: jest.fn(async (orcamento) => ({ ...orcamento, verificado: true })) };
  const policy = new GerarOrcamento({ orcamentosRepository, verificarEstoque, agora: () => agora });
  return { policy, orcamentosRepository, verificarEstoque };
};

describe('GerarOrcamento', () => {
  it('envia o orçamento com validade de 14 dias e devolve o resultado da verificação de estoque', async () => {
    const { policy, orcamentosRepository, verificarEstoque } = setup();

    const result = await policy.execute(ORDEM_SERVICO_ID);

    expect(orcamentosRepository.updateWithLock).toHaveBeenCalledWith(ORDEM_SERVICO_ID, expect.any(Function));
    expect(verificarEstoque.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ENVIADO', expira_em: new Date('2026-11-05T13:00:00.000Z') }),
    );
    expect(result).toMatchObject({ status: 'ENVIADO', verificado: true });
  });

  it('já enviado (retomada depois de falha): mantém a validade e verifica o estoque de novo', async () => {
    const expiraEm = new Date('2026-11-01T00:00:00.000Z');
    const { policy, verificarEstoque } = setup(
      buildOrcamento({ status: 'ENVIADO', expira_em: expiraEm, servicos: [buildOrcamentoServico()] }),
    );

    const result = await policy.execute(ORDEM_SERVICO_ID);

    expect(result).toMatchObject({ status: 'ENVIADO', expira_em: expiraEm, verificado: true });
    expect(verificarEstoque.execute).toHaveBeenCalled();
  });

  it('gera UnprocessableError quando a OS não tem orçamento (nenhum item adicionado)', async () => {
    const { policy, verificarEstoque } = setup(null);

    await expect(policy.execute(ORDEM_SERVICO_ID)).rejects.toThrow(
      new UnprocessableError('Adicione ao menos um serviço ou peça/insumo antes de concluir o diagnóstico'),
    );
    expect(verificarEstoque.execute).not.toHaveBeenCalled();
  });

  it('propaga a regra do domínio sem verificar estoque (orçamento já aprovado)', async () => {
    const { policy, verificarEstoque } = setup(
      buildOrcamento({ status: 'APROVADO', servicos: [buildOrcamentoServico()] }),
    );

    await expect(policy.execute(ORDEM_SERVICO_ID)).rejects.toThrow(ConflictError);
    expect(verificarEstoque.execute).not.toHaveBeenCalled();
  });

  it('usa o relógio do sistema por padrão', async () => {
    const rascunho = buildOrcamento({ servicos: [buildOrcamentoServico()] });
    const orcamentosRepository = { updateWithLock: jest.fn(async (id, change) => change(rascunho)) };
    const policy = new GerarOrcamento({ orcamentosRepository, verificarEstoque: { execute: async (o) => o } });

    const { expira_em } = await policy.execute(ORDEM_SERVICO_ID);

    expect(expira_em.getTime()).toBeGreaterThan(Date.now());
  });
});
