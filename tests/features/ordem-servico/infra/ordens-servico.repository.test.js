const mockTransaction = { LOCK: { UPDATE: 'UPDATE', NO_KEY_UPDATE: 'NO KEY UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/ordem-servico/infra/ordens-servico.model', () => ({
  OrdemServico: { findByPk: jest.fn(), findOne: jest.fn(), findAndCountAll: jest.fn() },
}));

const { OrdemServico } = require('@src/features/ordem-servico/infra/ordens-servico.model');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico();

describe('ordensServicoRepository.findByNumero', () => {
  it('devolve objeto simples ou null', async () => {
    OrdemServico.findOne.mockResolvedValueOnce({ toJSON: () => os }).mockResolvedValueOnce(null);

    await expect(ordensServicoRepository.findByNumero(42)).resolves.toEqual(os);
    await expect(ordensServicoRepository.findByNumero(43)).resolves.toBeNull();
    expect(OrdemServico.findOne).toHaveBeenCalledWith({ where: { numero: 42 } });
  });
});

describe('ordensServicoRepository.findAll', () => {
  it('aplica todos os filtros, pagina e ordena das mais recentes', async () => {
    OrdemServico.findAndCountAll.mockResolvedValue({ rows: [{ toJSON: () => os }], count: 1 });

    const result = await ordensServicoRepository.findAll({
      page: 2,
      limit: 10,
      filtros: { status: 'RECEBIDA', cliente_id: os.cliente_id, veiculo_id: os.veiculo_id },
    });

    expect(OrdemServico.findAndCountAll).toHaveBeenCalledWith({
      where: { status: 'RECEBIDA', cliente_id: os.cliente_id, veiculo_id: os.veiculo_id },
      offset: 10,
      limit: 10,
      order: [
        ['created_at', 'DESC'],
        ['numero', 'DESC'],
      ],
    });
    expect(result).toEqual({ rows: [os], count: 1 });
  });

  it('sem filtros', async () => {
    OrdemServico.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await ordensServicoRepository.findAll({ page: 1, limit: 20 });

    expect(OrdemServico.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {}, offset: 0 }));
  });
});

describe('ordensServicoRepository.updateWithLock', () => {
  it('trava a linha, aplica a mudança e grava na mesma transação', async () => {
    const updated = { ...os, status: 'EM_DIAGNOSTICO' };
    const row = { toJSON: jest.fn().mockReturnValueOnce(os).mockReturnValueOnce(updated), update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);
    const change = jest.fn().mockReturnValue({ status: 'EM_DIAGNOSTICO' });

    const result = await ordensServicoRepository.updateWithLock(os.id, change);

    // NO KEY UPDATE para não bloquear quem grava um orçamento com FK para a OS
    expect(OrdemServico.findByPk).toHaveBeenCalledWith(os.id, { transaction: mockTransaction, lock: 'NO KEY UPDATE' });
    expect(change).toHaveBeenCalledWith(os);
    expect(row.update).toHaveBeenCalledWith({ status: 'EM_DIAGNOSTICO' }, { transaction: mockTransaction });
    expect(result).toEqual(updated);
  });

  it('devolve null sem chamar a mudança quando a OS não existe', async () => {
    OrdemServico.findByPk.mockResolvedValue(null);
    const change = jest.fn();

    await expect(ordensServicoRepository.updateWithLock(os.id, change)).resolves.toBeNull();
    expect(change).not.toHaveBeenCalled();
  });

  it('não grava quando a mudança lança erro', async () => {
    const row = { toJSON: () => os, update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);

    await expect(
      ordensServicoRepository.updateWithLock(os.id, () => {
        throw new Error('Transição inválida');
      }),
    ).rejects.toThrow('Transição inválida');
    expect(row.update).not.toHaveBeenCalled();
  });
});

describe('ordensServicoRepository.findById', () => {
  it('devolve objeto simples ou null', async () => {
    OrdemServico.findByPk.mockResolvedValueOnce({ toJSON: () => os }).mockResolvedValueOnce(null);

    await expect(ordensServicoRepository.findById(os.id)).resolves.toEqual(os);
    await expect(ordensServicoRepository.findById(os.id)).resolves.toBeNull();
    expect(OrdemServico.findByPk).toHaveBeenCalledWith(os.id);
  });
});
