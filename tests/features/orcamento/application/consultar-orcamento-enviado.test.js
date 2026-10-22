const { ConsultarOrcamentoEnviado } = require('@src/features/orcamento/application/consultar-orcamento-enviado');
const { ORDEM_SERVICO_ID, buildOrcamento, buildOrcamentoServico } = require('../orcamento.fixtures');

const setup = (stored) => {
  const orcamentosRepository = { findByOrdemServico: jest.fn().mockResolvedValue(stored) };
  return { useCase: new ConsultarOrcamentoEnviado({ orcamentosRepository }), orcamentosRepository };
};

describe('ConsultarOrcamentoEnviado', () => {
  it('devolve o orçamento enviado com os itens', async () => {
    const enviado = buildOrcamento({ status: 'ENVIADO', servicos: [buildOrcamentoServico()] });
    const { useCase, orcamentosRepository } = setup(enviado);

    await expect(useCase.execute(ORDEM_SERVICO_ID)).resolves.toEqual(enviado);
    expect(orcamentosRepository.findByOrdemServico).toHaveBeenCalledWith(ORDEM_SERVICO_ID);
  });

  it('esconde o rascunho do diagnóstico', async () => {
    const { useCase } = setup(buildOrcamento({ servicos: [buildOrcamentoServico()] }));

    await expect(useCase.execute(ORDEM_SERVICO_ID)).resolves.toBeNull();
  });

  it('devolve null quando a OS não tem orçamento', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute(ORDEM_SERVICO_ID)).resolves.toBeNull();
  });
});
