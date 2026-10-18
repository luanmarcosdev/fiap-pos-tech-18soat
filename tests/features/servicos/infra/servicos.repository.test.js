jest.mock('@src/features/servicos/infra/servicos.model', () => ({
  Servico: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

const { Op, fn, col, where } = require('sequelize');
const { Servico } = require('@src/features/servicos/infra/servicos.model');
const servicosRepository = require('@src/features/servicos/infra/servicos.repository');
const { buildServico } = require('../servicos.fixtures');

const servico = buildServico();
const asModel = (data) => ({ toJSON: () => data });

describe('servicosRepository', () => {
  it('create, findById e findByNome devolvem objetos simples ou null', async () => {
    Servico.create.mockResolvedValue(asModel(servico));
    Servico.findByPk.mockResolvedValue(null);
    Servico.findOne.mockResolvedValue(asModel(servico));

    await expect(servicosRepository.create({})).resolves.toEqual(servico);
    await expect(servicosRepository.findById(servico.id)).resolves.toBeNull();
    await expect(servicosRepository.findByNome('TROCA DE ÓLEO')).resolves.toEqual(servico);
  });

  it('findByNome compara sem diferenciar maiúsculas', async () => {
    Servico.findOne.mockResolvedValue(null);

    await servicosRepository.findByNome('TROCA DE ÓLEO');

    expect(Servico.findOne).toHaveBeenCalledWith({ where: where(fn('lower', col('nome')), 'troca de óleo') });
  });

  it('findAll pagina e filtra com ILIKE escapado', async () => {
    Servico.findAndCountAll.mockResolvedValue({ rows: [asModel(servico)], count: 1 });

    const result = await servicosRepository.findAll({ page: 2, limit: 5, filtros: { nome: '100%' } });

    expect(Servico.findAndCountAll).toHaveBeenCalledWith({
      where: { nome: { [Op.iLike]: '%100\\%%' } },
      offset: 5,
      limit: 5,
      order: [['nome', 'ASC']],
    });
    expect(result).toEqual({ rows: [servico], count: 1 });
  });

  it('findAll sem filtros', async () => {
    Servico.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await servicosRepository.findAll({ page: 1, limit: 20 });

    expect(Servico.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('update e delete', async () => {
    Servico.update.mockResolvedValueOnce([1, [asModel(servico)]]).mockResolvedValueOnce([0, []]);
    Servico.destroy.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(servicosRepository.update(servico.id, {})).resolves.toEqual(servico);
    await expect(servicosRepository.update(servico.id, {})).resolves.toBeNull();
    await expect(servicosRepository.delete(servico.id)).resolves.toBe(true);
    await expect(servicosRepository.delete(servico.id)).resolves.toBe(false);
  });
});
