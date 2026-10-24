const { BaixarEstoque } = require('@src/features/orcamento/application/policies/baixar-estoque');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildOrcamento, buildOrcamentoPeca } = require('../../orcamento.fixtures');

const pastilha = buildOrcamentoPeca({ id: 'item-1', peca_id: 'p1', estoque_baixado: null });
const oleo = buildOrcamentoPeca({
  id: 'item-2',
  peca_id: 'p2',
  codigo: 'OL-5W30',
  nome: 'Óleo 5W30',
  quantidade: 4,
  estoque_baixado: null,
});

const setup = ({ baixarEstoquePeca = jest.fn().mockResolvedValue({}), compras = { solicitar: jest.fn() } } = {}) => {
  const orcamentosRepository = { marcarEstoqueBaixado: jest.fn() };
  const policy = new BaixarEstoque({ orcamentosRepository, baixarEstoquePeca, compras });
  return { policy, orcamentosRepository, baixarEstoquePeca, compras };
};

describe('BaixarEstoque', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('baixa cada peça/insumo, grava o resultado por item e não pede compra', async () => {
    const { policy, orcamentosRepository, baixarEstoquePeca, compras } = setup();
    const orcamento = buildOrcamento({ status: 'APROVADO', pecas: [pastilha, oleo] });

    const result = await policy.execute(orcamento);

    expect(baixarEstoquePeca).toHaveBeenCalledWith('p1', 2);
    expect(baixarEstoquePeca).toHaveBeenCalledWith('p2', 4);
    expect(orcamentosRepository.marcarEstoqueBaixado).toHaveBeenCalledWith('item-1', true);
    expect(orcamentosRepository.marcarEstoqueBaixado).toHaveBeenCalledWith('item-2', true);
    expect(result.pecas.map(({ estoque_baixado }) => estoque_baixado)).toEqual([true, true]);
    expect(compras.solicitar).not.toHaveBeenCalled();
  });

  it.each([
    ['sem estoque suficiente', new ConflictError('Estoque insuficiente')],
    ['removida do catálogo', new NotFoundError('Peça/insumo não encontrado')],
  ])('peça %s fica a adquirir e a compra é pedida', async (_, error) => {
    const baixarEstoquePeca = jest.fn(async (pecaId) => {
      if (pecaId === 'p2') throw error;
    });
    const { policy, orcamentosRepository, compras } = setup({ baixarEstoquePeca });
    const orcamento = buildOrcamento({ status: 'APROVADO', pecas: [pastilha, oleo] });

    const result = await policy.execute(orcamento);

    expect(orcamentosRepository.marcarEstoqueBaixado).toHaveBeenCalledWith('item-1', true);
    expect(orcamentosRepository.marcarEstoqueBaixado).toHaveBeenCalledWith('item-2', false);
    expect(result.pecas).toEqual([
      { ...pastilha, estoque_baixado: true },
      { ...oleo, estoque_baixado: false },
    ]);
    expect(compras.solicitar).toHaveBeenCalledWith({
      orcamentoId: orcamento.id,
      pecas: [{ ...oleo, estoque_baixado: false }],
    });
  });

  it('retomada: não baixa de novo o que já foi processado nem repete o pedido de compra', async () => {
    const { policy, baixarEstoquePeca, compras } = setup();
    const jaBaixada = { ...pastilha, estoque_baixado: true };
    const jaPedida = { ...oleo, id: 'item-3', peca_id: 'p3', estoque_baixado: false };
    const orcamento = buildOrcamento({ status: 'APROVADO', pecas: [jaBaixada, jaPedida, oleo] });

    const result = await policy.execute(orcamento);

    expect(baixarEstoquePeca).toHaveBeenCalledTimes(1);
    expect(baixarEstoquePeca).toHaveBeenCalledWith('p2', 4);
    expect(result.pecas).toEqual([jaBaixada, jaPedida, { ...oleo, estoque_baixado: true }]);
    expect(compras.solicitar).not.toHaveBeenCalled();
  });

  it('orçamento só com serviços não toca no estoque', async () => {
    const { policy, baixarEstoquePeca, orcamentosRepository } = setup();
    const orcamento = buildOrcamento({ status: 'APROVADO' });

    await expect(policy.execute(orcamento)).resolves.toEqual(orcamento);
    expect(baixarEstoquePeca).not.toHaveBeenCalled();
    expect(orcamentosRepository.marcarEstoqueBaixado).not.toHaveBeenCalled();
  });

  it('propaga falha inesperada da baixa sem marcar a peça (fica pendente para a retomada)', async () => {
    const { policy, orcamentosRepository } = setup({
      baixarEstoquePeca: jest.fn().mockRejectedValue(new Error('conexão perdida')),
    });

    await expect(policy.execute(buildOrcamento({ pecas: [pastilha] }))).rejects.toThrow('conexão perdida');
    expect(orcamentosRepository.marcarEstoqueBaixado).not.toHaveBeenCalled();
  });

  it('não propaga falha do sistema de compras', async () => {
    const compras = { solicitar: jest.fn().mockRejectedValue(new Error('fornecedor fora do ar')) };
    const { policy } = setup({ baixarEstoquePeca: jest.fn().mockRejectedValue(new ConflictError()), compras });

    const result = await policy.execute(buildOrcamento({ pecas: [pastilha] }));

    expect(result.pecas[0].estoque_baixado).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
