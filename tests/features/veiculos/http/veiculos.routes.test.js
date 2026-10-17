jest.mock('@src/features/veiculos/infra/veiculos.repository');
jest.mock('@src/features/clientes/infra/clientes.repository');

const request = require('supertest');
const app = require('@src/app');
const veiculosRepository = require('@src/features/veiculos/infra/veiculos.repository');
const clientesRepository = require('@src/features/clientes/infra/clientes.repository');
const { signToken } = require('@src/features/auth');
const veiculos = require('@src/features/veiculos');
const { PLACA, CLIENTE_ID, buildVeiculo, buildVeiculoPayload } = require('../veiculos.fixtures');

const veiculo = buildVeiculo();
const { token } = signToken({ sub: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin' });
const auth = { Authorization: `Bearer ${token}` };

const api = {
  post: (url) => request(app).post(url).set(auth),
  get: (url) => request(app).get(url).set(auth),
  put: (url) => request(app).put(url).set(auth),
  delete: (url) => request(app).delete(url).set(auth),
};

beforeEach(() => {
  clientesRepository.findById.mockResolvedValue({ id: CLIENTE_ID });
});

describe('/api/veiculos', () => {
  it('401 sem token', async () => {
    const response = await request(app).get('/api/veiculos');

    expect(response.status).toBe(401);
  });

  describe('POST /', () => {
    it('201 com a placa normalizada; valida o cliente pelo slice clientes', async () => {
      veiculosRepository.findByPlaca.mockResolvedValue(null);
      veiculosRepository.create.mockResolvedValue(veiculo);

      const response = await api.post('/api/veiculos').send(buildVeiculoPayload());

      expect(response.status).toBe(201);
      expect(response.body).toEqual(veiculo);
      expect(clientesRepository.findById).toHaveBeenCalledWith(CLIENTE_ID);
      expect(veiculosRepository.create).toHaveBeenCalledWith(expect.objectContaining({ placa: PLACA }));
    });

    it('400 com placa e ano inválidos', async () => {
      const response = await api.post('/api/veiculos').send(buildVeiculoPayload({ placa: 'AB12', ano: 1800 }));

      expect(response.status).toBe(400);
      expect(response.body.detalhes.map((d) => d.campo).sort()).toEqual(['ano', 'placa']);
    });

    it('409 com placa já cadastrada', async () => {
      veiculosRepository.findByPlaca.mockResolvedValue(veiculo);

      const response = await api.post('/api/veiculos').send(buildVeiculoPayload());

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'Já existe um veículo com esta placa' });
    });

    it('422 quando o cliente não existe', async () => {
      clientesRepository.findById.mockResolvedValue(null);

      const response = await api.post('/api/veiculos').send(buildVeiculoPayload());

      expect(response.status).toBe(422);
      expect(response.body).toEqual({ erro: 'Cliente não encontrado' });
      expect(veiculosRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /', () => {
    it('200 com data e meta; filtros chegam ao repository', async () => {
      veiculosRepository.findAll.mockResolvedValue({ rows: [veiculo], count: 1 });

      const response = await api.get(`/api/veiculos?cliente_id=${CLIENTE_ID}&placa=abc-1d23`);

      expect(response.status).toBe(200);
      expect(response.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(veiculosRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filtros: { cliente_id: CLIENTE_ID, placa: PLACA },
      });
    });
  });

  describe('GET /:id', () => {
    it('200, 404 e 400', async () => {
      veiculosRepository.findById.mockResolvedValueOnce(veiculo).mockResolvedValueOnce(null);

      expect((await api.get(`/api/veiculos/${veiculo.id}`)).status).toBe(200);
      expect((await api.get(`/api/veiculos/${veiculo.id}`)).status).toBe(404);
      expect((await api.get('/api/veiculos/123')).status).toBe(400);
    });
  });

  describe('PUT /:id', () => {
    it('200 com o veículo atualizado', async () => {
      veiculosRepository.findById.mockResolvedValue(veiculo);
      veiculosRepository.findByPlaca.mockResolvedValue(veiculo);
      veiculosRepository.update.mockResolvedValue({ ...veiculo, cor: 'Preto' });

      const response = await api.put(`/api/veiculos/${veiculo.id}`).send(buildVeiculoPayload({ cor: 'Preto' }));

      expect(response.status).toBe(200);
      expect(response.body.cor).toBe('Preto');
    });

    it('404, 409 e 422', async () => {
      veiculosRepository.findById.mockResolvedValueOnce(null);
      expect((await api.put(`/api/veiculos/${veiculo.id}`).send(buildVeiculoPayload())).status).toBe(404);

      veiculosRepository.findById.mockResolvedValue(veiculo);
      veiculosRepository.findByPlaca.mockResolvedValue(buildVeiculo({ id: 'c0ffee00-0000-4000-8000-000000000002' }));
      expect((await api.put(`/api/veiculos/${veiculo.id}`).send(buildVeiculoPayload())).status).toBe(409);

      clientesRepository.findById.mockResolvedValue(null);
      expect((await api.put(`/api/veiculos/${veiculo.id}`).send(buildVeiculoPayload())).status).toBe(422);
      expect(veiculosRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('204 e 404', async () => {
      veiculosRepository.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      expect((await api.delete(`/api/veiculos/${veiculo.id}`)).status).toBe(204);
      expect((await api.delete(`/api/veiculos/${veiculo.id}`)).status).toBe(404);
    });
  });
});

describe('interface pública (index.js)', () => {
  it('getVeiculoByPlaca normaliza a placa antes de buscar', async () => {
    veiculosRepository.findByPlaca.mockResolvedValue(veiculo);

    await expect(veiculos.getVeiculoByPlaca('abc-1d23')).resolves.toEqual(veiculo);
    expect(veiculosRepository.findByPlaca).toHaveBeenCalledWith(PLACA);
  });

  it('listVeiculosByCliente devolve os veículos do cliente', async () => {
    veiculosRepository.findAllByCliente.mockResolvedValue([veiculo]);

    await expect(veiculos.listVeiculosByCliente(CLIENTE_ID)).resolves.toEqual([veiculo]);
  });
});
