jest.mock('@src/features/servicos/infra/servicos.repository');

const request = require('supertest');
const app = require('@src/app');
const servicosRepository = require('@src/features/servicos/infra/servicos.repository');
const { signToken } = require('@src/features/auth');
const servicos = require('@src/features/servicos');
const { buildServico, buildServicoPayload } = require('../servicos.fixtures');

const servico = buildServico();
const { token } = signToken({ sub: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin' });
const auth = { Authorization: `Bearer ${token}` };

const api = {
  post: (url) => request(app).post(url).set(auth),
  get: (url) => request(app).get(url).set(auth),
  put: (url) => request(app).put(url).set(auth),
  delete: (url) => request(app).delete(url).set(auth),
};

describe('/api/servicos', () => {
  it('401 sem token', async () => {
    expect((await request(app).get('/api/servicos')).status).toBe(401);
  });

  describe('POST /', () => {
    it('201 com o serviço', async () => {
      servicosRepository.findByNome.mockResolvedValue(null);
      servicosRepository.create.mockResolvedValue(servico);

      const response = await api.post('/api/servicos').send(buildServicoPayload());

      expect(response.status).toBe(201);
      expect(response.body).toEqual(servico);
    });

    it('400 sem nome', async () => {
      const response = await api.post('/api/servicos').send({ descricao: 'x', preco: 120 });

      expect(response.status).toBe(400);
      expect(response.body.detalhes).toEqual([{ campo: 'nome', mensagem: expect.any(String) }]);
    });

    it('409 com nome repetido', async () => {
      servicosRepository.findByNome.mockResolvedValue(servico);

      const response = await api.post('/api/servicos').send(buildServicoPayload());

      expect(response.status).toBe(409);
    });
  });

  it('GET / 200 com data e meta', async () => {
    servicosRepository.findAll.mockResolvedValue({ rows: [servico], count: 1 });

    const response = await api.get('/api/servicos?nome=óleo&limit=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [servico], meta: { page: 1, limit: 10, total: 1 } });
    expect(servicosRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, filtros: { nome: 'óleo' } });
  });

  it('GET /:id 200, 404 e 400', async () => {
    servicosRepository.findById.mockResolvedValueOnce(servico).mockResolvedValueOnce(null);

    expect((await api.get(`/api/servicos/${servico.id}`)).status).toBe(200);
    expect((await api.get(`/api/servicos/${servico.id}`)).status).toBe(404);
    expect((await api.get('/api/servicos/abc')).status).toBe(400);
  });

  it('PUT /:id 200, 404 e 409', async () => {
    servicosRepository.findById.mockResolvedValue(servico);
    servicosRepository.findByNome.mockResolvedValue(servico);
    servicosRepository.update.mockResolvedValue({ ...servico, descricao: null });
    const url = `/api/servicos/${servico.id}`;

    const ok = await api.put(url).send({ nome: 'Troca de óleo', preco: 120 });
    expect(ok.status).toBe(200);
    expect(ok.body.descricao).toBeNull();

    servicosRepository.findByNome.mockResolvedValue(buildServico({ id: 'c0ffee00-0000-4000-8000-000000000002' }));
    expect((await api.put(url).send(buildServicoPayload())).status).toBe(409);

    servicosRepository.findById.mockResolvedValue(null);
    expect((await api.put(url).send(buildServicoPayload())).status).toBe(404);
  });

  it('DELETE /:id 204 e 404', async () => {
    servicosRepository.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect((await api.delete(`/api/servicos/${servico.id}`)).status).toBe(204);
    expect((await api.delete(`/api/servicos/${servico.id}`)).status).toBe(404);
  });
});

describe('interface pública (index.js)', () => {
  it('getServicoById devolve o objeto do repository', async () => {
    servicosRepository.findById.mockResolvedValue(servico);

    await expect(servicos.getServicoById(servico.id)).resolves.toEqual(servico);
  });
});
