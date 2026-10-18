const { makeServicosService } = require('@src/features/servicos/application/servicos.service');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildServico, buildServicoPayload } = require('../servicos.fixtures');

const servico = buildServico();

const setup = () => {
  const servicosRepository = {
    create: jest.fn(async (data) => ({ id: servico.id, ...data })),
    findById: jest.fn().mockResolvedValue(servico),
    findByNome: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    update: jest.fn(async (id, data) => ({ id, ...data })),
    delete: jest.fn().mockResolvedValue(true),
  };
  return { service: makeServicosService({ servicosRepository }), servicosRepository };
};

describe('servicosService', () => {
  describe('create', () => {
    it('cadastra quando o nome está livre', async () => {
      const { service, servicosRepository } = setup();

      await service.create(buildServicoPayload());

      expect(servicosRepository.findByNome).toHaveBeenCalledWith('Troca de óleo');
      expect(servicosRepository.create).toHaveBeenCalledWith(buildServicoPayload());
    });

    it('gera ConflictError com nome repetido', async () => {
      const { service, servicosRepository } = setup();
      servicosRepository.findByNome.mockResolvedValue(servico);

      await expect(service.create(buildServicoPayload())).rejects.toThrow(
        new ConflictError('Já existe um serviço com este nome'),
      );
      expect(servicosRepository.create).not.toHaveBeenCalled();
    });
  });

  it('getById devolve o serviço ou gera NotFoundError', async () => {
    const { service, servicosRepository } = setup();

    await expect(service.getById(servico.id)).resolves.toEqual(servico);
    servicosRepository.findById.mockResolvedValue(null);
    await expect(service.getById(servico.id)).rejects.toThrow(new NotFoundError('Serviço não encontrado'));
  });

  it('list repassa o filtro e monta o meta', async () => {
    const { service, servicosRepository } = setup();
    servicosRepository.findAll.mockResolvedValue({ rows: [servico], count: 1 });

    const result = await service.list({ page: 1, limit: 20, nome: 'óleo' });

    expect(servicosRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20, filtros: { nome: 'óleo' } });
    expect(result).toEqual({ data: [servico], meta: { page: 1, limit: 20, total: 1 } });
  });

  describe('update', () => {
    it('atualiza mantendo o próprio nome', async () => {
      const { service, servicosRepository } = setup();
      servicosRepository.findByNome.mockResolvedValue(servico);

      await service.update(servico.id, buildServicoPayload({ descricao: null }));

      expect(servicosRepository.update).toHaveBeenCalledWith(servico.id, buildServicoPayload({ descricao: null }));
    });

    it('gera NotFoundError quando não existe', async () => {
      const { service, servicosRepository } = setup();
      servicosRepository.findById.mockResolvedValue(null);

      await expect(service.update(servico.id, buildServicoPayload())).rejects.toThrow(NotFoundError);
    });

    it('gera ConflictError quando o nome pertence a outro serviço', async () => {
      const { service, servicosRepository } = setup();
      servicosRepository.findByNome.mockResolvedValue(buildServico({ id: 'outro-id' }));

      await expect(service.update(servico.id, buildServicoPayload())).rejects.toThrow(ConflictError);
      expect(servicosRepository.update).not.toHaveBeenCalled();
    });
  });

  it('remove apaga ou gera NotFoundError', async () => {
    const { service, servicosRepository } = setup();

    await expect(service.remove(servico.id)).resolves.toBeUndefined();
    servicosRepository.delete.mockResolvedValue(false);
    await expect(service.remove(servico.id)).rejects.toThrow(NotFoundError);
  });
});
