jest.mock('@src/features/clientes/infra/clientes.model', () => ({
  Cliente: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

const { Op } = require('sequelize');
const { Cliente } = require('@src/features/clientes/infra/clientes.model');
const clientesRepository = require('@src/features/clientes/infra/clientes.repository');
const { CPF, buildCliente } = require('../clientes.fixtures');

const cliente = buildCliente();
const asModel = (data) => ({ toJSON: () => data });

describe('clientesRepository', () => {
  it('create devolve um objeto simples', async () => {
    Cliente.create.mockResolvedValue(asModel(cliente));

    await expect(clientesRepository.create({ nome: 'Maria' })).resolves.toEqual(cliente);
    expect(Cliente.create).toHaveBeenCalledWith({ nome: 'Maria' });
  });

  it('findById devolve o objeto ou null', async () => {
    Cliente.findByPk.mockResolvedValueOnce(asModel(cliente)).mockResolvedValueOnce(null);

    await expect(clientesRepository.findById(cliente.id)).resolves.toEqual(cliente);
    await expect(clientesRepository.findById(cliente.id)).resolves.toBeNull();
  });

  it('findByDocumento busca pelo documento', async () => {
    Cliente.findOne.mockResolvedValue(asModel(cliente));

    await expect(clientesRepository.findByDocumento(CPF)).resolves.toEqual(cliente);
    expect(Cliente.findOne).toHaveBeenCalledWith({ where: { documento: CPF } });
  });

  describe('findAll', () => {
    it('pagina com offset e limit e filtra nome com ILIKE escapado', async () => {
      Cliente.findAndCountAll.mockResolvedValue({ rows: [asModel(cliente)], count: 21 });

      const result = await clientesRepository.findAll({
        page: 3,
        limit: 10,
        filtros: { nome: '50%_off', documento: CPF },
      });

      expect(Cliente.findAndCountAll).toHaveBeenCalledWith({
        where: { nome: { [Op.iLike]: '%50\\%\\_off%' }, documento: CPF },
        offset: 20,
        limit: 10,
        order: [['nome', 'ASC']],
      });
      expect(result).toEqual({ rows: [cliente], count: 21 });
    });

    it('não filtra quando não há filtros', async () => {
      Cliente.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await clientesRepository.findAll({ page: 1, limit: 20 });

      expect(Cliente.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {}, offset: 0 }));
    });
  });

  it('update devolve o registro atualizado ou null', async () => {
    Cliente.update.mockResolvedValueOnce([1, [asModel(cliente)]]).mockResolvedValueOnce([0, []]);

    await expect(clientesRepository.update(cliente.id, { nome: 'Maria' })).resolves.toEqual(cliente);
    expect(Cliente.update).toHaveBeenCalledWith({ nome: 'Maria' }, { where: { id: cliente.id }, returning: true });
    await expect(clientesRepository.update(cliente.id, {})).resolves.toBeNull();
  });

  it('delete faz soft delete e informa se removeu', async () => {
    Cliente.destroy.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(clientesRepository.delete(cliente.id)).resolves.toBe(true);
    expect(Cliente.destroy).toHaveBeenCalledWith({ where: { id: cliente.id } });
    await expect(clientesRepository.delete(cliente.id)).resolves.toBe(false);
  });
});
