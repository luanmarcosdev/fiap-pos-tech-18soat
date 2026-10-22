const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/orcamento/infra/orcamentos.model', () => ({
  Orcamento: { findOrCreate: jest.fn(), findByPk: jest.fn(), update: jest.fn() },
  OrcamentoServico: { findAll: jest.fn(), create: jest.fn() },
  OrcamentoPeca: { findAll: jest.fn(), create: jest.fn() },
}));

const { Orcamento, OrcamentoServico, OrcamentoPeca } = require('@src/features/orcamento/infra/orcamentos.model');
const orcamentosRepository = require('@src/features/orcamento/infra/orcamentos.repository');
const {
  ORDEM_SERVICO_ID,
  buildOrcamento,
  buildOrcamentoServico,
  buildOrcamentoPeca,
} = require('../orcamento.fixtures');

// linha da tabela orcamentos, sem os itens
const orcamento = buildOrcamento();
delete orcamento.servicos;
delete orcamento.pecas;
const servicoExistente = buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 30 });
const pecaExistente = buildOrcamentoPeca({ peca_id: 'outra' });
const asModel = (data) => ({ id: data.id, toJSON: () => data });

describe.each([
  ['addServico', OrcamentoServico, buildOrcamentoServico()],
  ['addPeca', OrcamentoPeca, buildOrcamentoPeca()],
])('orcamentosRepository.%s', (method, ItemModel, item) => {
  beforeEach(() => {
    Orcamento.findOrCreate.mockResolvedValue([asModel(orcamento), false]);
    OrcamentoServico.findAll.mockResolvedValue([asModel(servicoExistente)]);
    OrcamentoPeca.findAll.mockResolvedValue([asModel(pecaExistente)]);
  });

  it('cria/trava o rascunho, aplica a mudança e grava item e total na mesma transação', async () => {
    const final = { ...orcamento, valor_total: 200 };
    Orcamento.findByPk.mockResolvedValueOnce(asModel(orcamento)).mockResolvedValueOnce(asModel(final));
    const change = jest.fn().mockReturnValue({ item, valor_total: 200 });

    const result = await orcamentosRepository[method](ORDEM_SERVICO_ID, change);

    expect(Orcamento.findOrCreate).toHaveBeenCalledWith({
      where: { ordem_servico_id: ORDEM_SERVICO_ID },
      transaction: mockTransaction,
    });
    expect(Orcamento.findByPk).toHaveBeenNthCalledWith(1, orcamento.id, { transaction: mockTransaction, lock: 'UPDATE' });
    expect(change).toHaveBeenCalledWith({ ...orcamento, servicos: [servicoExistente], pecas: [pecaExistente] });
    expect(ItemModel.create).toHaveBeenCalledWith(
      { ...item, orcamento_id: orcamento.id },
      { transaction: mockTransaction },
    );
    expect(Orcamento.update).toHaveBeenCalledWith(
      { valor_total: 200 },
      { where: { id: orcamento.id }, transaction: mockTransaction },
    );
    expect(Orcamento.findByPk).toHaveBeenNthCalledWith(
      2,
      orcamento.id,
      expect.objectContaining({
        include: [{ association: 'servicos' }, { association: 'pecas' }],
        transaction: mockTransaction,
      }),
    );
    expect(result).toEqual(final);
  });

  it('não grava quando a mudança lança erro', async () => {
    Orcamento.findByPk.mockResolvedValue(asModel(orcamento));

    await expect(
      orcamentosRepository[method](ORDEM_SERVICO_ID, () => {
        throw new Error('Item já adicionado ao orçamento');
      }),
    ).rejects.toThrow('Item já adicionado ao orçamento');
    expect(ItemModel.create).not.toHaveBeenCalled();
    expect(Orcamento.update).not.toHaveBeenCalled();
  });
});
