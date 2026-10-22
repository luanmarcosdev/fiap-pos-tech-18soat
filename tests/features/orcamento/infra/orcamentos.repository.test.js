const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/orcamento/infra/orcamentos.model', () => ({
  Orcamento: { findOrCreate: jest.fn(), findByPk: jest.fn(), update: jest.fn() },
  OrcamentoServico: { findAll: jest.fn(), create: jest.fn() },
}));

const { Orcamento, OrcamentoServico } = require('@src/features/orcamento/infra/orcamentos.model');
const orcamentosRepository = require('@src/features/orcamento/infra/orcamentos.repository');
const { ORDEM_SERVICO_ID, buildOrcamento, buildOrcamentoServico } = require('../orcamento.fixtures');

// linha da tabela orcamentos, sem os itens
const orcamento = buildOrcamento();
delete orcamento.servicos;
const existente = buildOrcamentoServico({ servico_id: 'outro', valor_unitario: 30 });
const asModel = (data) => ({ id: data.id, toJSON: () => data });

describe('orcamentosRepository.addServico', () => {
  beforeEach(() => {
    Orcamento.findOrCreate.mockResolvedValue([asModel(orcamento), false]);
    OrcamentoServico.findAll.mockResolvedValue([asModel(existente)]);
  });

  it('cria/trava o rascunho, aplica a mudança e grava item e total na mesma transação', async () => {
    const final = { ...orcamento, valor_total: 150, servicos: [existente, buildOrcamentoServico()] };
    Orcamento.findByPk.mockResolvedValueOnce(asModel(orcamento)).mockResolvedValueOnce(asModel(final));
    const change = jest.fn().mockReturnValue({ servico: buildOrcamentoServico(), valor_total: 150 });

    const result = await orcamentosRepository.addServico(ORDEM_SERVICO_ID, change);

    expect(Orcamento.findOrCreate).toHaveBeenCalledWith({
      where: { ordem_servico_id: ORDEM_SERVICO_ID },
      transaction: mockTransaction,
    });
    expect(Orcamento.findByPk).toHaveBeenNthCalledWith(1, orcamento.id, { transaction: mockTransaction, lock: 'UPDATE' });
    expect(change).toHaveBeenCalledWith({ ...orcamento, servicos: [existente] });
    expect(OrcamentoServico.create).toHaveBeenCalledWith(
      { ...buildOrcamentoServico(), orcamento_id: orcamento.id },
      { transaction: mockTransaction },
    );
    expect(Orcamento.update).toHaveBeenCalledWith(
      { valor_total: 150 },
      { where: { id: orcamento.id }, transaction: mockTransaction },
    );
    expect(Orcamento.findByPk).toHaveBeenNthCalledWith(2, orcamento.id, expect.objectContaining({
      include: [{ association: 'servicos' }],
      transaction: mockTransaction,
    }));
    expect(result).toEqual(final);
  });

  it('não grava quando a mudança lança erro', async () => {
    Orcamento.findByPk.mockResolvedValue(asModel(orcamento));

    await expect(
      orcamentosRepository.addServico(ORDEM_SERVICO_ID, () => {
        throw new Error('Serviço já adicionado ao orçamento');
      }),
    ).rejects.toThrow('Serviço já adicionado ao orçamento');
    expect(OrcamentoServico.create).not.toHaveBeenCalled();
    expect(Orcamento.update).not.toHaveBeenCalled();
  });
});
