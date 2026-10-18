jest.mock('@src/features/clientes/infra/clientes.repository');
// o app carrega o slice veiculos, que registra um guard de remoção consultando o próprio repository
jest.mock('@src/features/veiculos/infra/veiculos.repository');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('@src/app');
const clientesRepository = require('@src/features/clientes/infra/clientes.repository');
const { signToken } = require('@src/features/auth');
const clientes = require('@src/features/clientes');
const { CPF, buildCliente, buildClientePayload } = require('../clientes.fixtures');

const cliente = buildCliente();
const { token } = signToken({ sub: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin' });
const auth = { Authorization: `Bearer ${token}` };

const api = {
  post: (url) => request(app).post(url).set(auth),
  get: (url) => request(app).get(url).set(auth),
  put: (url) => request(app).put(url).set(auth),
  delete: (url) => request(app).delete(url).set(auth),
};

describe('/api/clientes', () => {
  describe('autenticação', () => {
    it('401 sem token', async () => {
      const response = await request(app).get('/api/clientes');

      expect(response.status).toBe(401);
      expect(clientesRepository.findAll).not.toHaveBeenCalled();
    });

    it('401 com token inválido', async () => {
      const response = await request(app).get('/api/clientes').set('Authorization', 'Bearer invalido');

      expect(response.status).toBe(401);
    });

    it('401 com token expirado', async () => {
      const expired = jwt.sign({ usuario: 'admin', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);

      const response = await request(app).get('/api/clientes').set('Authorization', `Bearer ${expired}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ erro: 'Token inválido ou expirado' });
    });
  });

  describe('POST /', () => {
    it('201 com o cliente; repository recebe documento sem máscara e tipo_pessoa', async () => {
      clientesRepository.findByDocumento.mockResolvedValue(null);
      clientesRepository.create.mockResolvedValue(cliente);

      const response = await api.post('/api/clientes').send(buildClientePayload());

      expect(response.status).toBe(201);
      expect(response.body).toEqual(cliente);
      expect(clientesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ documento: CPF, tipo_pessoa: 'PF', telefone: '11987654321', cep: '01310100' }),
      );
    });

    it('400 com detalhes por campo', async () => {
      const response = await api.post('/api/clientes').send(buildClientePayload({ documento: '123', estado: 'XX' }));

      expect(response.status).toBe(400);
      expect(response.body.detalhes.map((d) => d.campo).sort()).toEqual(['documento', 'estado']);
      expect(clientesRepository.create).not.toHaveBeenCalled();
    });

    it('409 com documento já cadastrado', async () => {
      clientesRepository.findByDocumento.mockResolvedValue(cliente);

      const response = await api.post('/api/clientes').send(buildClientePayload());

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'Já existe um cliente com este documento' });
    });
  });

  describe('GET /', () => {
    it('200 com data e meta; filtros e paginação chegam ao repository', async () => {
      clientesRepository.findAll.mockResolvedValue({ rows: [cliente], count: 1 });

      const response = await api.get('/api/clientes?page=2&limit=5&nome=maria&documento=529.982.247-25');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [cliente], meta: { page: 2, limit: 5, total: 1 } });
      expect(clientesRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        filtros: { nome: 'maria', documento: CPF },
      });
    });

    it('400 com paginação inválida', async () => {
      const response = await api.get('/api/clientes?limit=500');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /:id', () => {
    it('200 com o cliente', async () => {
      clientesRepository.findById.mockResolvedValue(cliente);

      const response = await api.get(`/api/clientes/${cliente.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(cliente);
    });

    it('404 quando não existe', async () => {
      clientesRepository.findById.mockResolvedValue(null);

      const response = await api.get(`/api/clientes/${cliente.id}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ erro: 'Cliente não encontrado' });
    });

    it('400 com id que não é UUID', async () => {
      const response = await api.get('/api/clientes/123');

      expect(response.status).toBe(400);
      expect(response.body.detalhes[0].campo).toBe('id');
      expect(clientesRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('PUT /:id', () => {
    it('200 com o cliente atualizado', async () => {
      const updated = { ...cliente, nome: 'Maria Souza' };
      clientesRepository.findById.mockResolvedValue(cliente);
      clientesRepository.findByDocumento.mockResolvedValue(cliente);
      clientesRepository.update.mockResolvedValue(updated);

      const response = await api.put(`/api/clientes/${cliente.id}`).send(buildClientePayload({ nome: 'Maria Souza' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updated);
    });

    it('404 quando não existe', async () => {
      clientesRepository.findById.mockResolvedValue(null);

      const response = await api.put(`/api/clientes/${cliente.id}`).send(buildClientePayload());

      expect(response.status).toBe(404);
    });

    it('409 com documento de outro cliente', async () => {
      clientesRepository.findById.mockResolvedValue(cliente);
      clientesRepository.findByDocumento.mockResolvedValue(buildCliente({ id: 'c0ffee00-0000-4000-8000-000000000002' }));

      const response = await api.put(`/api/clientes/${cliente.id}`).send(buildClientePayload());

      expect(response.status).toBe(409);
      expect(clientesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('204 ao remover', async () => {
      clientesRepository.findById.mockResolvedValue(cliente);
      clientesRepository.delete.mockResolvedValue(true);

      const response = await api.delete(`/api/clientes/${cliente.id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('404 quando não existe', async () => {
      clientesRepository.findById.mockResolvedValue(null);

      const response = await api.delete(`/api/clientes/${cliente.id}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('interface pública (index.js)', () => {
  it('getClienteById devolve o objeto do repository', async () => {
    clientesRepository.findById.mockResolvedValue(cliente);

    await expect(clientes.getClienteById(cliente.id)).resolves.toEqual(cliente);
  });

  it('getClienteByDocumento normaliza o documento antes de buscar', async () => {
    clientesRepository.findByDocumento.mockResolvedValue(null);

    await expect(clientes.getClienteByDocumento('529.982.247-25')).resolves.toBeNull();
    expect(clientesRepository.findByDocumento).toHaveBeenCalledWith(CPF);
  });
});
