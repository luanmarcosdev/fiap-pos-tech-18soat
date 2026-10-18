const { makeClientesService } = require('@src/features/clientes/application/clientes.service');
const { ConflictError, NotFoundError, ValidationError } = require('@src/shared/errors');
const { CPF, CNPJ, buildCliente, buildClientePayload } = require('../clientes.fixtures');

const cliente = buildCliente();

const setup = ({ removalGuards } = {}) => {
  const clientesRepository = {
    create: jest.fn(async (data) => ({ id: cliente.id, ...data })),
    findById: jest.fn().mockResolvedValue(cliente),
    findByDocumento: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    update: jest.fn(async (id, data) => ({ id, ...data })),
    delete: jest.fn().mockResolvedValue(true),
  };
  return { service: makeClientesService({ clientesRepository, removalGuards }), clientesRepository };
};

describe('clientesService', () => {
  describe('create', () => {
    it('grava o documento normalizado e deriva PF', async () => {
      const { service, clientesRepository } = setup();

      const result = await service.create(buildClientePayload());

      expect(clientesRepository.findByDocumento).toHaveBeenCalledWith(CPF);
      expect(clientesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ documento: CPF, tipo_pessoa: 'PF' }),
      );
      expect(result.id).toBe(cliente.id);
    });

    it('deriva PJ para CNPJ', async () => {
      const { service, clientesRepository } = setup();

      await service.create(buildClientePayload({ documento: '11.222.333/0001-81' }));

      expect(clientesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ documento: CNPJ, tipo_pessoa: 'PJ' }),
      );
    });

    it('gera ConflictError se o documento já estiver cadastrado', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findByDocumento.mockResolvedValue(cliente);

      await expect(service.create(buildClientePayload())).rejects.toThrow(ConflictError);
      expect(clientesRepository.create).not.toHaveBeenCalled();
    });

    it('gera ValidationError se o documento for inválido (o domínio não confia na camada http)', async () => {
      const { service } = setup();

      await expect(service.create(buildClientePayload({ documento: '123' }))).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('devolve o cliente', async () => {
      const { service } = setup();

      await expect(service.getById(cliente.id)).resolves.toEqual(cliente);
    });

    it('gera NotFoundError quando não existe', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findById.mockResolvedValue(null);

      await expect(service.getById(cliente.id)).rejects.toThrow(new NotFoundError('Cliente não encontrado'));
    });
  });

  describe('list', () => {
    it('repassa filtros e paginação e monta o meta', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findAll.mockResolvedValue({ rows: [cliente], count: 21 });

      const result = await service.list({ page: 2, limit: 10, nome: 'maria', documento: undefined });

      expect(clientesRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        filtros: { nome: 'maria', documento: undefined },
      });
      expect(result).toEqual({ data: [cliente], meta: { page: 2, limit: 10, total: 21 } });
    });
  });

  describe('update', () => {
    it('atualiza mantendo o mesmo documento', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findByDocumento.mockResolvedValue(cliente);

      await service.update(cliente.id, buildClientePayload({ nome: 'Maria Souza' }));

      expect(clientesRepository.update).toHaveBeenCalledWith(
        cliente.id,
        expect.objectContaining({ nome: 'Maria Souza', documento: CPF }),
      );
    });

    it('recalcula tipo_pessoa ao trocar CPF por CNPJ', async () => {
      const { service, clientesRepository } = setup();

      await service.update(cliente.id, buildClientePayload({ documento: CNPJ }));

      expect(clientesRepository.update).toHaveBeenCalledWith(
        cliente.id,
        expect.objectContaining({ documento: CNPJ, tipo_pessoa: 'PJ' }),
      );
    });

    it('gera NotFoundError quando o cliente não existe', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findById.mockResolvedValue(null);

      await expect(service.update(cliente.id, buildClientePayload())).rejects.toThrow(NotFoundError);
      expect(clientesRepository.update).not.toHaveBeenCalled();
    });

    it('gera ConflictError quando o documento pertence a outro cliente', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findByDocumento.mockResolvedValue(buildCliente({ id: 'outro-id' }));

      await expect(service.update(cliente.id, buildClientePayload())).rejects.toThrow(ConflictError);
      expect(clientesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('remove o cliente', async () => {
      const { service, clientesRepository } = setup();

      await expect(service.remove(cliente.id)).resolves.toBeUndefined();
      expect(clientesRepository.delete).toHaveBeenCalledWith(cliente.id);
    });

    it('gera NotFoundError quando não existe', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.findById.mockResolvedValue(null);

      await expect(service.remove(cliente.id)).rejects.toThrow(NotFoundError);
      expect(clientesRepository.delete).not.toHaveBeenCalled();
    });

    it('gera NotFoundError se o cliente sumir entre a busca e a remoção', async () => {
      const { service, clientesRepository } = setup();
      clientesRepository.delete.mockResolvedValue(false);

      await expect(service.remove(cliente.id)).rejects.toThrow(NotFoundError);
    });

    it('consulta os guards e remove quando nenhum bloqueia', async () => {
      const guard = jest.fn().mockResolvedValue(null);
      const { service, clientesRepository } = setup({ removalGuards: [guard] });

      await service.remove(cliente.id);

      expect(guard).toHaveBeenCalledWith(cliente.id);
      expect(clientesRepository.delete).toHaveBeenCalledWith(cliente.id);
    });

    it('gera ConflictError com o motivo do guard que bloqueia', async () => {
      const guards = [jest.fn().mockResolvedValue(null), jest.fn().mockResolvedValue('Cliente possui veículos ativos')];
      const { service, clientesRepository } = setup({ removalGuards: guards });

      await expect(service.remove(cliente.id)).rejects.toThrow(new ConflictError('Cliente possui veículos ativos'));
      expect(clientesRepository.delete).not.toHaveBeenCalled();
    });
  });
});
