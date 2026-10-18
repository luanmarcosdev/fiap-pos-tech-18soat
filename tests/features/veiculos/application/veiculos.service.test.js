const { makeVeiculosService } = require('@src/features/veiculos/application/veiculos.service');
const { ConflictError, NotFoundError, UnprocessableError, ValidationError } = require('@src/shared/errors');
const { PLACA, CLIENTE_ID, buildVeiculo, buildVeiculoPayload } = require('../veiculos.fixtures');

const veiculo = buildVeiculo();

const setup = () => {
  const veiculosRepository = {
    create: jest.fn(async (data) => ({ id: veiculo.id, ...data })),
    findById: jest.fn().mockResolvedValue(veiculo),
    findByPlaca: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    update: jest.fn(async (id, data) => ({ id, ...data })),
    delete: jest.fn().mockResolvedValue(true),
  };
  const getClienteById = jest.fn().mockResolvedValue({ id: CLIENTE_ID });
  const service = makeVeiculosService({ veiculosRepository, getClienteById });
  return { service, veiculosRepository, getClienteById };
};

describe('veiculosService', () => {
  describe('create', () => {
    it('grava a placa normalizada depois de validar o cliente', async () => {
      const { service, veiculosRepository, getClienteById } = setup();

      await service.create(buildVeiculoPayload());

      expect(getClienteById).toHaveBeenCalledWith(CLIENTE_ID);
      expect(veiculosRepository.findByPlaca).toHaveBeenCalledWith(PLACA);
      expect(veiculosRepository.create).toHaveBeenCalledWith(expect.objectContaining({ placa: PLACA }));
    });

    it('gera UnprocessableError se o cliente não existir', async () => {
      const { service, veiculosRepository, getClienteById } = setup();
      getClienteById.mockResolvedValue(null);

      await expect(service.create(buildVeiculoPayload())).rejects.toThrow(
        new UnprocessableError('Cliente não encontrado'),
      );
      expect(veiculosRepository.create).not.toHaveBeenCalled();
    });

    it('gera ConflictError se a placa já estiver cadastrada', async () => {
      const { service, veiculosRepository } = setup();
      veiculosRepository.findByPlaca.mockResolvedValue(veiculo);

      await expect(service.create(buildVeiculoPayload())).rejects.toThrow(ConflictError);
      expect(veiculosRepository.create).not.toHaveBeenCalled();
    });

    it('gera ValidationError se a placa for inválida', async () => {
      const { service } = setup();

      await expect(service.create(buildVeiculoPayload({ placa: 'X' }))).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('devolve o veículo ou gera NotFoundError', async () => {
      const { service, veiculosRepository } = setup();

      await expect(service.getById(veiculo.id)).resolves.toEqual(veiculo);
      veiculosRepository.findById.mockResolvedValue(null);
      await expect(service.getById(veiculo.id)).rejects.toThrow(new NotFoundError('Veículo não encontrado'));
    });
  });

  describe('list', () => {
    it('repassa filtros e paginação e monta o meta', async () => {
      const { service, veiculosRepository } = setup();
      veiculosRepository.findAll.mockResolvedValue({ rows: [veiculo], count: 1 });

      const result = await service.list({ page: 1, limit: 20, cliente_id: CLIENTE_ID, placa: PLACA });

      expect(veiculosRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filtros: { cliente_id: CLIENTE_ID, placa: PLACA },
      });
      expect(result).toEqual({ data: [veiculo], meta: { page: 1, limit: 20, total: 1 } });
    });
  });

  describe('update', () => {
    it('atualiza mantendo a mesma placa', async () => {
      const { service, veiculosRepository } = setup();
      veiculosRepository.findByPlaca.mockResolvedValue(veiculo);

      await service.update(veiculo.id, buildVeiculoPayload({ cor: 'Preto' }));

      expect(veiculosRepository.update).toHaveBeenCalledWith(
        veiculo.id,
        expect.objectContaining({ placa: PLACA, cor: 'Preto' }),
      );
    });

    it('gera NotFoundError quando o veículo não existe', async () => {
      const { service, veiculosRepository } = setup();
      veiculosRepository.findById.mockResolvedValue(null);

      await expect(service.update(veiculo.id, buildVeiculoPayload())).rejects.toThrow(NotFoundError);
    });

    it('gera UnprocessableError ao trocar para um cliente inexistente', async () => {
      const { service, veiculosRepository, getClienteById } = setup();
      getClienteById.mockResolvedValue(null);

      await expect(service.update(veiculo.id, buildVeiculoPayload())).rejects.toThrow(UnprocessableError);
      expect(veiculosRepository.update).not.toHaveBeenCalled();
    });

    it('gera ConflictError quando a placa pertence a outro veículo', async () => {
      const { service, veiculosRepository } = setup();
      veiculosRepository.findByPlaca.mockResolvedValue(buildVeiculo({ id: 'outro-id' }));

      await expect(service.update(veiculo.id, buildVeiculoPayload())).rejects.toThrow(ConflictError);
      expect(veiculosRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('remove o veículo ou gera NotFoundError', async () => {
      const { service, veiculosRepository } = setup();

      await expect(service.remove(veiculo.id)).resolves.toBeUndefined();
      veiculosRepository.delete.mockResolvedValue(false);
      await expect(service.remove(veiculo.id)).rejects.toThrow(NotFoundError);
    });
  });
});
