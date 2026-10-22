const { ListarOrdensServico } = require('@src/features/ordem-servico/application/listar-ordens-servico');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

describe('ListarOrdensServico', () => {
  it('repassa os filtros e devolve a página com data e meta', async () => {
    const os = buildOrdemServico();
    const ordensServicoRepository = { findAll: jest.fn().mockResolvedValue({ rows: [os], count: 21 }) };
    const useCase = new ListarOrdensServico({ ordensServicoRepository });

    const result = await useCase.execute({ page: 2, limit: 20, status: 'RECEBIDA', cliente_id: os.cliente_id });

    expect(ordensServicoRepository.findAll).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      filtros: { status: 'RECEBIDA', cliente_id: os.cliente_id },
    });
    expect(result).toEqual({ data: [os], meta: { page: 2, limit: 20, total: 21 } });
  });
});
