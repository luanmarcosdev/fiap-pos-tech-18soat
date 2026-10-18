const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)) },
}));
jest.mock('@src/features/pecas/infra/pecas.model', () => ({
  Peca: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

const { Op, literal } = require('sequelize');
const { Peca } = require('@src/features/pecas/infra/pecas.model');
const pecasRepository = require('@src/features/pecas/infra/pecas.repository');
const { containsIgnoringAccents } = require('@src/infra/database/text-search');
const { buildPeca } = require('../pecas.fixtures');

const peca = buildPeca();
const asModel = (data) => ({ toJSON: () => data });

describe('pecasRepository', () => {
  it('create, findById e findByCodigo devolvem objetos simples ou null', async () => {
    Peca.create.mockResolvedValue(asModel(peca));
    Peca.findByPk.mockResolvedValue(null);
    Peca.findOne.mockResolvedValue(asModel(peca));

    await expect(pecasRepository.create({})).resolves.toEqual(peca);
    await expect(pecasRepository.findById(peca.id)).resolves.toBeNull();
    await expect(pecasRepository.findByCodigo('FLT-OLEO-01')).resolves.toEqual(peca);
    expect(Peca.findOne).toHaveBeenCalledWith({ where: { codigo: 'FLT-OLEO-01' } });
  });

  describe('findAll', () => {
    it('aplica todos os filtros', async () => {
      Peca.findAndCountAll.mockResolvedValue({ rows: [asModel(peca)], count: 1 });

      const result = await pecasRepository.findAll({
        page: 2,
        limit: 10,
        filtros: { codigo: 'FLT', tipo: 'PECA', nome: 'filtro', abaixo_minimo: true },
      });

      expect(Peca.findAndCountAll).toHaveBeenCalledWith({
        where: {
          codigo: 'FLT',
          tipo: 'PECA',
          [Op.and]: [
            containsIgnoringAccents('nome', 'filtro'),
            literal('"quantidade_estoque" <= "estoque_minimo"'),
          ],
        },
        offset: 10,
        limit: 10,
        order: [['nome', 'ASC']],
      });
      expect(result).toEqual({ rows: [peca], count: 1 });
    });

    it('sem filtros (abaixo_minimo false não filtra)', async () => {
      Peca.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await pecasRepository.findAll({ page: 1, limit: 20, filtros: { abaixo_minimo: false } });

      expect(Peca.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  it('update e delete', async () => {
    Peca.update.mockResolvedValueOnce([1, [asModel(peca)]]).mockResolvedValueOnce([0, []]);
    Peca.destroy.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(pecasRepository.update(peca.id, {})).resolves.toEqual(peca);
    await expect(pecasRepository.update(peca.id, {})).resolves.toBeNull();
    await expect(pecasRepository.delete(peca.id)).resolves.toBe(true);
    await expect(pecasRepository.delete(peca.id)).resolves.toBe(false);
  });

  describe('updateStock', () => {
    it('trava a linha, aplica a mudança e grava na mesma transação', async () => {
      const updated = { ...peca, quantidade_estoque: 5 };
      const row = { toJSON: jest.fn().mockReturnValueOnce(peca).mockReturnValueOnce(updated), update: jest.fn() };
      Peca.findByPk.mockResolvedValue(row);
      const change = jest.fn().mockReturnValue({ quantidade_estoque: 5 });

      const result = await pecasRepository.updateStock(peca.id, change);

      expect(Peca.findByPk).toHaveBeenCalledWith(peca.id, { transaction: mockTransaction, lock: 'UPDATE' });
      expect(change).toHaveBeenCalledWith(peca);
      expect(row.update).toHaveBeenCalledWith(
        { quantidade_estoque: 5 },
        { transaction: mockTransaction },
      );
      expect(result).toEqual(updated);
    });

    it('devolve null sem chamar a mudança quando a peça não existe', async () => {
      Peca.findByPk.mockResolvedValue(null);
      const change = jest.fn();

      await expect(pecasRepository.updateStock(peca.id, change)).resolves.toBeNull();
      expect(change).not.toHaveBeenCalled();
    });

    it('não grava quando a mudança lança erro', async () => {
      const row = { toJSON: () => peca, update: jest.fn() };
      Peca.findByPk.mockResolvedValue(row);

      await expect(
        pecasRepository.updateStock(peca.id, () => {
          throw new Error('Estoque insuficiente');
        }),
      ).rejects.toThrow('Estoque insuficiente');
      expect(row.update).not.toHaveBeenCalled();
    });
  });
});
