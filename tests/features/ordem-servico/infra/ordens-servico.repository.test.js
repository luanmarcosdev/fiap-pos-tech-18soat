const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/ordem-servico/infra/ordens-servico.model', () => ({
  OrdemServico: { findByPk: jest.fn() },
}));

const { OrdemServico } = require('@src/features/ordem-servico/infra/ordens-servico.model');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico();

describe('ordensServicoRepository.updateWithLock', () => {
  it('trava a linha, aplica a mudança e grava na mesma transação', async () => {
    const updated = { ...os, status: 'EM_DIAGNOSTICO' };
    const row = { toJSON: jest.fn().mockReturnValueOnce(os).mockReturnValueOnce(updated), update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);
    const change = jest.fn().mockReturnValue({ status: 'EM_DIAGNOSTICO' });

    const result = await ordensServicoRepository.updateWithLock(os.id, change);

    expect(OrdemServico.findByPk).toHaveBeenCalledWith(os.id, { transaction: mockTransaction, lock: 'UPDATE' });
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
