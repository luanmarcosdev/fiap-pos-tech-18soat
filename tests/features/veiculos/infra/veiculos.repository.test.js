jest.mock('@src/features/veiculos/infra/veiculos.model', () => ({
  Veiculo: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

const { Veiculo } = require('@src/features/veiculos/infra/veiculos.model');
const veiculosRepository = require('@src/features/veiculos/infra/veiculos.repository');
const { PLACA, CLIENTE_ID, buildVeiculo } = require('../veiculos.fixtures');

const veiculo = buildVeiculo();
const asModel = (data) => ({ toJSON: () => data });

describe('veiculosRepository', () => {
  it('create devolve um objeto simples', async () => {
    Veiculo.create.mockResolvedValue(asModel(veiculo));

    await expect(veiculosRepository.create({ placa: PLACA })).resolves.toEqual(veiculo);
  });

  it('findById e findByPlaca devolvem o objeto ou null', async () => {
    Veiculo.findByPk.mockResolvedValue(null);
    Veiculo.findOne.mockResolvedValue(asModel(veiculo));

    await expect(veiculosRepository.findById(veiculo.id)).resolves.toBeNull();
    await expect(veiculosRepository.findByPlaca(PLACA)).resolves.toEqual(veiculo);
    expect(Veiculo.findOne).toHaveBeenCalledWith({ where: { placa: PLACA } });
  });

  it('findAllByCliente lista os veículos do cliente', async () => {
    Veiculo.findAll.mockResolvedValue([asModel(veiculo)]);

    await expect(veiculosRepository.findAllByCliente(CLIENTE_ID)).resolves.toEqual([veiculo]);
    expect(Veiculo.findAll).toHaveBeenCalledWith({ where: { cliente_id: CLIENTE_ID }, order: [['placa', 'ASC']] });
  });

  it('countByCliente conta os veículos ativos do cliente', async () => {
    Veiculo.count.mockResolvedValue(2);

    await expect(veiculosRepository.countByCliente(CLIENTE_ID)).resolves.toBe(2);
    expect(Veiculo.count).toHaveBeenCalledWith({ where: { cliente_id: CLIENTE_ID } });
  });

  it('findAll pagina e aplica os filtros', async () => {
    Veiculo.findAndCountAll.mockResolvedValue({ rows: [asModel(veiculo)], count: 11 });

    const result = await veiculosRepository.findAll({
      page: 2,
      limit: 10,
      filtros: { cliente_id: CLIENTE_ID, placa: PLACA },
    });

    expect(Veiculo.findAndCountAll).toHaveBeenCalledWith({
      where: { cliente_id: CLIENTE_ID, placa: PLACA },
      offset: 10,
      limit: 10,
      order: [['placa', 'ASC']],
    });
    expect(result).toEqual({ rows: [veiculo], count: 11 });
  });

  it('findAll sem filtros', async () => {
    Veiculo.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await veiculosRepository.findAll({ page: 1, limit: 20 });

    expect(Veiculo.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('update devolve o registro atualizado ou null', async () => {
    Veiculo.update.mockResolvedValueOnce([1, [asModel(veiculo)]]).mockResolvedValueOnce([0, []]);

    await expect(veiculosRepository.update(veiculo.id, {})).resolves.toEqual(veiculo);
    expect(Veiculo.update).toHaveBeenCalledWith({}, { where: { id: veiculo.id }, returning: true });
    await expect(veiculosRepository.update(veiculo.id, {})).resolves.toBeNull();
  });

  it('delete informa se removeu', async () => {
    Veiculo.destroy.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(veiculosRepository.delete(veiculo.id)).resolves.toBe(true);
    await expect(veiculosRepository.delete(veiculo.id)).resolves.toBe(false);
  });
});
