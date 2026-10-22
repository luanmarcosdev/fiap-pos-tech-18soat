const { VerificarEstoque } = require('@src/features/orcamento/application/policies/verificar-estoque');
const { NotFoundError } = require('@src/shared/errors');
const { buildOrcamento, buildOrcamentoPeca } = require('../../orcamento.fixtures');

const catalogo = {
  fluido: { id: 'fluido', nome: 'Fluido de freio', quantidade_estoque: 10 },
  pastilha: { id: 'pastilha', nome: 'Pastilha de freio', quantidade_estoque: 0 },
  filtro: { id: 'filtro', nome: 'Filtro de óleo', quantidade_estoque: 5 },
};

const setup = ({ reservas = {}, getPecaById } = {}) => {
  const orcamentosRepository = { sumReservasByPeca: jest.fn().mockResolvedValue(reservas) };
  const buscarPeca =
    getPecaById ??
    jest.fn(async (id) => {
      if (!catalogo[id]) throw new NotFoundError('Peça não encontrada');
      return catalogo[id];
    });
  const policy = new VerificarEstoque({ orcamentosRepository, getPecaById: buscarPeca });
  return { policy, orcamentosRepository };
};

describe('VerificarEstoque', () => {
  it('marca em_estoque descontando o reservado por outros orçamentos e inclui o nome da peça', async () => {
    const { policy, orcamentosRepository } = setup({ reservas: { fluido: 3, filtro: 1 } });
    const orcamento = buildOrcamento({
      pecas: [
        buildOrcamentoPeca({ peca_id: 'fluido', quantidade: 7 }), // 10 - 3 = 7: cobre
        buildOrcamentoPeca({ peca_id: 'filtro', quantidade: 5 }), // 5 - 1 = 4: não cobre
        buildOrcamentoPeca({ peca_id: 'pastilha', quantidade: 1 }), // sem estoque
      ],
    });

    const result = await policy.execute(orcamento);

    expect(orcamentosRepository.sumReservasByPeca).toHaveBeenCalledWith(['fluido', 'filtro', 'pastilha'], orcamento.id);
    expect(result.pecas.map(({ peca_id, nome, em_estoque }) => ({ peca_id, nome, em_estoque }))).toEqual([
      { peca_id: 'fluido', nome: 'Fluido de freio', em_estoque: true },
      { peca_id: 'filtro', nome: 'Filtro de óleo', em_estoque: false },
      { peca_id: 'pastilha', nome: 'Pastilha de freio', em_estoque: false },
    ]);
    expect(result.id).toBe(orcamento.id);
  });

  it('peça removida do catálogo conta como fora de estoque', async () => {
    const { policy } = setup();

    const result = await policy.execute(buildOrcamento({ pecas: [buildOrcamentoPeca({ peca_id: 'removida' })] }));

    expect(result.pecas[0]).toMatchObject({ nome: null, em_estoque: false });
  });

  it('propaga outros erros do slice pecas', async () => {
    const { policy } = setup({ getPecaById: jest.fn().mockRejectedValue(new Error('conexão perdida')) });

    await expect(policy.execute(buildOrcamento({ pecas: [buildOrcamentoPeca()] }))).rejects.toThrow('conexão perdida');
  });

  it('orçamento só com serviços continua sem peças', async () => {
    const { policy } = setup();

    await expect(policy.execute(buildOrcamento())).resolves.toMatchObject({ pecas: [] });
  });
});
