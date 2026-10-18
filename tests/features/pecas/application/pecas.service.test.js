const { makePecasService } = require('@src/features/pecas/application/pecas.service');
const { ConflictError, NotFoundError, ValidationError } = require('@src/shared/errors');
const { buildPeca, buildPecaPayload } = require('../pecas.fixtures');

const peca = buildPeca(); // estoque 10, mínimo 2

const setup = (stored = peca) => {
  let current = stored ? { ...stored } : null;
  const pecasRepository = {
    create: jest.fn(async (data) => ({ ...buildPeca({ quantidade_estoque: 0 }), ...data })),
    findById: jest.fn(async () => current),
    findByCodigo: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    update: jest.fn(async (id, data) => ({ ...current, ...data })),
    // simula a transação: entrega o estado atual para o callback e grava o resultado
    updateStock: jest.fn(async (id, change) => {
      if (!current) return null;
      current = { ...current, ...(await change(current)) };
      return current;
    }),
    delete: jest.fn().mockResolvedValue(true),
  };
  return { service: makePecasService({ pecasRepository }), pecasRepository, state: () => current };
};

describe('pecasService', () => {
  it('getById inclui abaixo_minimo', async () => {
    await expect(setup().service.getById(peca.id)).resolves.toEqual({ ...peca, abaixo_minimo: false });
  });

  it('getById gera NotFoundError', async () => {
    await expect(setup(null).service.getById(peca.id)).rejects.toThrow(new NotFoundError('Peça não encontrada'));
  });

  describe('create', () => {
    it('cadastra com estoque zerado', async () => {
      const { service, pecasRepository } = setup();

      const result = await service.create(buildPecaPayload({ codigo: 'FLT-OLEO-01' }));

      expect(pecasRepository.findByCodigo).toHaveBeenCalledWith('FLT-OLEO-01');
      expect(result).toMatchObject({ quantidade_estoque: 0, abaixo_minimo: true });
    });

    it('gera ConflictError com código repetido', async () => {
      const { service, pecasRepository } = setup();
      pecasRepository.findByCodigo.mockResolvedValue(peca);

      await expect(service.create(buildPecaPayload())).rejects.toThrow(
        new ConflictError('Já existe uma peça com este código'),
      );
    });
  });

  it('list repassa os filtros e inclui abaixo_minimo', async () => {
    const { service, pecasRepository } = setup();
    pecasRepository.findAll.mockResolvedValue({ rows: [peca], count: 1 });

    const result = await service.list({ page: 1, limit: 20, nome: 'filtro', abaixo_minimo: true });

    expect(pecasRepository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      filtros: { nome: 'filtro', abaixo_minimo: true },
    });
    expect(result).toEqual({ data: [{ ...peca, abaixo_minimo: false }], meta: { page: 1, limit: 20, total: 1 } });
  });

  describe('update', () => {
    it('atualiza mantendo o próprio código', async () => {
      const { service, pecasRepository } = setup();
      pecasRepository.findByCodigo.mockResolvedValue(peca);

      const result = await service.update(peca.id, { ...buildPecaPayload(), preco_unitario: 42.5 });

      expect(result.preco_unitario).toBe(42.5);
    });

    it('gera NotFoundError e ConflictError', async () => {
      await expect(setup(null).service.update(peca.id, buildPecaPayload())).rejects.toThrow(NotFoundError);

      const conflict = setup();
      conflict.pecasRepository.findByCodigo.mockResolvedValue(buildPeca({ id: 'outra' }));
      await expect(conflict.service.update(peca.id, buildPecaPayload())).rejects.toThrow(ConflictError);
      expect(conflict.pecasRepository.update).not.toHaveBeenCalled();
    });
  });

  it('remove apaga ou gera NotFoundError', async () => {
    const { service, pecasRepository } = setup();

    await expect(service.remove(peca.id)).resolves.toBeUndefined();
    pecasRepository.delete.mockResolvedValue(false);
    await expect(service.remove(peca.id)).rejects.toThrow(NotFoundError);
  });

  describe('operações de estoque', () => {
    it('hasStock (Verificar Estoque)', async () => {
      const { service } = setup();

      await expect(service.hasStock(peca.id, 10)).resolves.toBe(true);
      await expect(service.hasStock(peca.id, 11)).resolves.toBe(false);
      await expect(setup(null).service.hasStock(peca.id, 1)).rejects.toThrow(NotFoundError);
    });

    it('registerEntry e consume gravam o novo estoque', async () => {
      const { service, state } = setup();

      const entry = await service.registerEntry(peca.id, 5);
      expect(entry).toMatchObject({ quantidade_estoque: 15, abaixo_minimo: false });

      const consumed = await service.consume(peca.id, 13);
      expect(state().quantidade_estoque).toBe(2);
      expect(consumed.abaixo_minimo).toBe(true);
    });

    it('propaga o erro da entidade sem gravar', async () => {
      const { service, state } = setup();

      await expect(service.consume(peca.id, 11)).rejects.toThrow(new ConflictError('Estoque insuficiente'));
      await expect(service.registerEntry(peca.id, 0)).rejects.toThrow(ValidationError);
      expect(state().quantidade_estoque).toBe(10);
    });

    it('gera NotFoundError quando a peça não existe', async () => {
      await expect(setup(null).service.consume(peca.id, 1)).rejects.toThrow(NotFoundError);
    });
  });
});
