jest.mock('@src/features/pecas/infra/pecas.repository');

const request = require('supertest');
const app = require('@src/app');
const pecasRepository = require('@src/features/pecas/infra/pecas.repository');
const { signToken } = require('@src/features/auth');
const pecas = require('@src/features/pecas');
const { buildPeca, buildPecaPayload } = require('../pecas.fixtures');

const peca = buildPeca(); // estoque 10, mínimo 2
const view = { ...peca, abaixo_minimo: false };
const { token } = signToken({ sub: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin' });
const auth = { Authorization: `Bearer ${token}` };

const api = {
  post: (url) => request(app).post(url).set(auth),
  get: (url) => request(app).get(url).set(auth),
  put: (url) => request(app).put(url).set(auth),
  delete: (url) => request(app).delete(url).set(auth),
};

// o repository mockado executa a mudança de estoque sobre o estado informado, como a transação real
const mockUpdateStock = (stored) =>
  pecasRepository.updateStock.mockImplementation(async (id, change) =>
    stored ? { ...stored, ...(await change(stored)) } : null,
  );

describe('/api/pecas', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/pecas')).status).toBe(401);
  });

  describe('POST /', () => {
    it('201 com código normalizado e campos calculados', async () => {
      pecasRepository.findByCodigo.mockResolvedValue(null);
      pecasRepository.create.mockResolvedValue(buildPeca({ quantidade_estoque: 0 }));

      const response = await api.post('/api/pecas').send(buildPecaPayload({ quantidade_estoque: 50 }));

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ quantidade_estoque: 0, abaixo_minimo: true });
      expect(pecasRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'FLT-OLEO-01', unidade_medida: 'UN' }),
      );
      expect(pecasRepository.create.mock.calls[0][0]).not.toHaveProperty('quantidade_estoque');
    });

    it('400 com preço inválido', async () => {
      const response = await api.post('/api/pecas').send(buildPecaPayload({ preco_unitario: 1.999 }));

      expect(response.status).toBe(400);
      expect(response.body.detalhes).toEqual([{ campo: 'preco_unitario', mensagem: 'Use no máximo 2 casas decimais' }]);
    });

    it('409 com código repetido', async () => {
      pecasRepository.findByCodigo.mockResolvedValue(peca);

      expect((await api.post('/api/pecas').send(buildPecaPayload())).status).toBe(409);
    });
  });

  it('GET / com filtros', async () => {
    pecasRepository.findAll.mockResolvedValue({ rows: [peca], count: 1 });

    const response = await api.get('/api/pecas?abaixo_minimo=true&tipo=PECA&codigo=flt-oleo-01&nome=filtro');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [view], meta: { page: 1, limit: 20, total: 1 } });
    expect(pecasRepository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      filtros: { abaixo_minimo: true, tipo: 'PECA', codigo: 'FLT-OLEO-01', nome: 'filtro' },
    });
  });

  it('GET /:id 200, 404 e 400', async () => {
    pecasRepository.findById.mockResolvedValueOnce(peca).mockResolvedValueOnce(null);

    const ok = await api.get(`/api/pecas/${peca.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual(view);
    expect((await api.get(`/api/pecas/${peca.id}`)).status).toBe(404);
    expect((await api.get('/api/pecas/x')).status).toBe(400);
  });

  it('PUT /:id não repassa campos de estoque', async () => {
    pecasRepository.findById.mockResolvedValue(peca);
    pecasRepository.findByCodigo.mockResolvedValue(peca);
    pecasRepository.update.mockResolvedValue({ ...peca, preco_unitario: 42.5 });

    const response = await api
      .put(`/api/pecas/${peca.id}`)
      .send(buildPecaPayload({ preco_unitario: 42.5, quantidade_estoque: 999 }));

    expect(response.status).toBe(200);
    expect(response.body.preco_unitario).toBe(42.5);
    const data = pecasRepository.update.mock.calls[0][1];
    expect(data).not.toHaveProperty('quantidade_estoque');
  });

  it('DELETE /:id 204 e 404', async () => {
    pecasRepository.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect((await api.delete(`/api/pecas/${peca.id}`)).status).toBe(204);
    expect((await api.delete(`/api/pecas/${peca.id}`)).status).toBe(404);
  });

  describe('POST /:id/entradas', () => {
    it('200 com o estoque atualizado', async () => {
      mockUpdateStock(peca);

      const response = await api.post(`/api/pecas/${peca.id}/entradas`).send({ quantidade: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ quantidade_estoque: 15, abaixo_minimo: false });
    });

    it('400 com quantidade inválida', async () => {
      const response = await api.post(`/api/pecas/${peca.id}/entradas`).send({ quantidade: 0 });

      expect(response.status).toBe(400);
      expect(pecasRepository.updateStock).not.toHaveBeenCalled();
    });

    it('404 quando a peça não existe', async () => {
      mockUpdateStock(null);

      expect((await api.post(`/api/pecas/${peca.id}/entradas`).send({ quantidade: 1 })).status).toBe(404);
    });
  });
});

describe('interface pública (index.js)', () => {
  it('getPecaById devolve a peça com os campos calculados', async () => {
    pecasRepository.findById.mockResolvedValue(peca);

    await expect(pecas.getPecaById(peca.id)).resolves.toEqual(view);
  });

  it('hasPecaInStock (Verificar Estoque)', async () => {
    pecasRepository.findById.mockResolvedValue(peca);

    await expect(pecas.hasPecaInStock(peca.id, 10)).resolves.toBe(true);
    await expect(pecas.hasPecaInStock(peca.id, 11)).resolves.toBe(false);
  });

  it('consumePecaStock (Baixar Estoque) desconta ou gera ConflictError', async () => {
    mockUpdateStock(peca);

    await expect(pecas.consumePecaStock(peca.id, 3)).resolves.toMatchObject({ quantidade_estoque: 7 });
    await expect(pecas.consumePecaStock(peca.id, 11)).rejects.toMatchObject({
      status: 409,
      message: 'Estoque insuficiente',
    });
  });
});
