const mockTransaction = { LOCK: { UPDATE: 'UPDATE', NO_KEY_UPDATE: 'NO KEY UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/ordem-servico/infra/ordens-servico.model', () => ({
  OrdemServico: { findByPk: jest.fn(), findOne: jest.fn() },
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
