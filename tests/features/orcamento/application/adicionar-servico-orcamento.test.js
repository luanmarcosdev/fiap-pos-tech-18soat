const { AdicionarServicoOrcamento } = require('@src/features/orcamento/application/adicionar-servico-orcamento');
const { ConflictError, UnprocessableError } = require('@src/shared/errors');
const { ORDEM_SERVICO_ID, buildOrcamento, buildOrcamentoServico } = require('../orcamento.fixtures');

const servico = { id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', nome: 'Troca de óleo', preco: 120 };

const setup = ({ stored = buildOrcamento(), servicoEncontrado = servico } = {}) => {
  const orcamentosRepository = {
    // simula a transação: entrega o orçamento atual para o callback e devolve o que seria gravado
    addServico: jest.fn(async (ordemServicoId, change) => {
      const { servico: item, valor_total } = await change(stored);
      return { ...stored, valor_total, servicos: [...stored.servicos, item] };
    }),
  };
  const getServicoById = jest.fn().mockResolvedValue(servicoEncontrado);
  const useCase = new AdicionarServicoOrcamento({ orcamentosRepository, getServicoById });
  return { useCase, orcamentosRepository, getServicoById };
};

describe('AdicionarServicoOrcamento', () => {
  it('inclui o serviço com o preço do catálogo e o novo total', async () => {
    const existente = buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 30 });
    const { useCase, orcamentosRepository, getServicoById } = setup({
      stored: buildOrcamento({ servicos: [existente] }),
    });

    const result = await useCase.execute(ORDEM_SERVICO_ID, servico.id);

    expect(getServicoById).toHaveBeenCalledWith(servico.id);
    expect(orcamentosRepository.addServico).toHaveBeenCalledWith(ORDEM_SERVICO_ID, expect.any(Function));
    expect(result).toMatchObject({
      valor_total: 150,
      servicos: [existente, { servico_id: servico.id, valor_unitario: 120 }],
    });
  });

  it('gera UnprocessableError sem tocar no orçamento quando o serviço não existe', async () => {
    const { useCase, orcamentosRepository } = setup({ servicoEncontrado: null });

    await expect(useCase.execute(ORDEM_SERVICO_ID, servico.id)).rejects.toThrow(
      new UnprocessableError('Serviço não encontrado'),
    );
    expect(orcamentosRepository.addServico).not.toHaveBeenCalled();
  });

  it('propaga a regra do domínio (serviço repetido)', async () => {
    const { useCase } = setup({ stored: buildOrcamento({ servicos: [buildOrcamentoServico()] }) });

    await expect(useCase.execute(ORDEM_SERVICO_ID, servico.id)).rejects.toThrow(ConflictError);
  });
});
