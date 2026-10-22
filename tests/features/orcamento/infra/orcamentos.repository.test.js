const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/orcamento/infra/orcamentos.model', () => ({
  Orcamento: { findOrCreate: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), update: jest.fn() },
  OrcamentoServico: { findAll: jest.fn(), create: jest.fn() },
  OrcamentoPeca: { findAll: jest.fn(), create: jest.fn() },
}));

const { Op, fn, col } = require('sequelize');
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
const comItens = { ...orcamento, servicos: [servicoExistente], pecas: [pecaExistente] };
const asModel = (data) => ({ id: data.id, toJSON: () => data, update: jest.fn() });
const lockedQuery = { where: { ordem_servico_id: ORDEM_SERVICO_ID }, transaction: mockTransaction, lock: 'UPDATE' };

beforeEach(() => {
  OrcamentoServico.findAll.mockResolvedValue([asModel(servicoExistente)]);
  OrcamentoPeca.findAll.mockResolvedValue([asModel(pecaExistente)]);
});

describe.each([
  ['addServico', OrcamentoServico, buildOrcamentoServico()],
  ['addPeca', OrcamentoPeca, buildOrcamentoPeca()],
])('orcamentosRepository.%s', (method, ItemModel, item) => {
  beforeEach(() => {
    Orcamento.findOrCreate.mockResolvedValue([asModel(orcamento), false]);
    Orcamento.findOne.mockResolvedValue(asModel(orcamento));
  });

  it('cria/trava o rascunho, aplica a mudança e grava item e total na mesma transação', async () => {
    const final = { ...orcamento, valor_total: 200 };
    Orcamento.findByPk.mockResolvedValue(asModel(final));
    const change = jest.fn().mockReturnValue({ item, valor_total: 200 });

    const result = await orcamentosRepository[method](ORDEM_SERVICO_ID, change);

    expect(Orcamento.findOrCreate).toHaveBeenCalledWith({
      where: { ordem_servico_id: ORDEM_SERVICO_ID },
      transaction: mockTransaction,
    });
    expect(Orcamento.findOne).toHaveBeenCalledWith(lockedQuery);
    expect(change).toHaveBeenCalledWith(comItens);
    expect(ItemModel.create).toHaveBeenCalledWith(
      { ...item, orcamento_id: orcamento.id },
      { transaction: mockTransaction },
    );
    expect(Orcamento.update).toHaveBeenCalledWith(
      { valor_total: 200 },
      { where: { id: orcamento.id }, transaction: mockTransaction },
    );
    expect(Orcamento.findByPk).toHaveBeenCalledWith(
      orcamento.id,
      expect.objectContaining({
        include: [{ association: 'servicos' }, { association: 'pecas' }],
        transaction: mockTransaction,
      }),
    );
    expect(result).toEqual(final);
  });

  it('não grava quando a mudança lança erro', async () => {
    await expect(
      orcamentosRepository[method](ORDEM_SERVICO_ID, () => {
        throw new Error('Item já adicionado ao orçamento');
      }),
    ).rejects.toThrow('Item já adicionado ao orçamento');
    expect(ItemModel.create).not.toHaveBeenCalled();
    expect(Orcamento.update).not.toHaveBeenCalled();
  });
});

describe('orcamentosRepository.updateWithLock', () => {
  it('trava o orçamento da OS, aplica a mudança sobre ele com os itens e grava', async () => {
    const row = asModel(orcamento);
    const gerado = { ...comItens, status: 'ENVIADO' };
    Orcamento.findOne.mockResolvedValue(row);
    Orcamento.findByPk.mockResolvedValue(asModel(gerado));
    const change = jest.fn().mockReturnValue({ status: 'ENVIADO' });

    const result = await orcamentosRepository.updateWithLock(ORDEM_SERVICO_ID, change);

    expect(Orcamento.findOne).toHaveBeenCalledWith(lockedQuery);
    expect(change).toHaveBeenCalledWith(comItens);
    expect(row.update).toHaveBeenCalledWith({ status: 'ENVIADO' }, { transaction: mockTransaction });
    expect(result).toEqual(gerado);
  });

  it('devolve null, sem criar rascunho nem chamar a mudança, quando a OS não tem orçamento', async () => {
    Orcamento.findOne.mockResolvedValue(null);
    const change = jest.fn();

    await expect(orcamentosRepository.updateWithLock(ORDEM_SERVICO_ID, change)).resolves.toBeNull();
    expect(Orcamento.findOrCreate).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('não grava quando a mudança lança erro', async () => {
    const row = asModel(orcamento);
    Orcamento.findOne.mockResolvedValue(row);

    await expect(
      orcamentosRepository.updateWithLock(ORDEM_SERVICO_ID, () => {
        throw new Error('O orçamento já foi gerado');
      }),
    ).rejects.toThrow('O orçamento já foi gerado');
    expect(row.update).not.toHaveBeenCalled();
  });
});

describe('orcamentosRepository.sumReservasByPeca', () => {
  it('soma as quantidades das peças em orçamentos enviados, exceto o informado', async () => {
    OrcamentoPeca.findAll.mockResolvedValue([
      { peca_id: 'p1', reservado: '3' },
      { peca_id: 'p2', reservado: '10' },
    ]);

    const result = await orcamentosRepository.sumReservasByPeca(['p1', 'p2', 'p3'], orcamento.id);

    expect(OrcamentoPeca.findAll).toHaveBeenCalledWith({
      attributes: ['peca_id', [fn('SUM', col('quantidade')), 'reservado']],
      where: { peca_id: ['p1', 'p2', 'p3'] },
      include: [{ model: Orcamento, attributes: [], where: { status: 'ENVIADO', id: { [Op.ne]: orcamento.id } } }],
      group: ['peca_id'],
      raw: true,
    });
    expect(result).toEqual({ p1: 3, p2: 10 });
  });

  it('não consulta o banco sem peças', async () => {
    await expect(orcamentosRepository.sumReservasByPeca([], orcamento.id)).resolves.toEqual({});
    expect(OrcamentoPeca.findAll).not.toHaveBeenCalled();
  });
});
