jest.mock('@src/features/ordem-servico/infra/ordens-servico.repository');
jest.mock('@src/features/clientes/infra/clientes.repository');

const request = require('supertest');
const app = require('@src/app');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const clientesRepository = require('@src/features/clientes/infra/clientes.repository');
const { signToken } = require('@src/features/auth');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico();
const { token } = signToken({ sub: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin' });
const auth = { Authorization: `Bearer ${token}` };

// o repository mockado executa a mudança sobre o estado informado, como a transação real
const mockUpdateWithLock = (stored) =>
  ordensServicoRepository.updateWithLock.mockImplementation(async (id, change) =>
    stored ? { ...stored, ...(await change(stored)) } : null,
  );

describe('/api/ordens-servico', () => {
  beforeEach(() => jest.spyOn(console, 'info').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  describe('POST /:id/iniciar-diagnostico', () => {
    const url = `/api/ordens-servico/${os.id}/iniciar-diagnostico`;

    it('401 sem token', async () => {
      expect((await request(app).post(url)).status).toBe(401);
    });

    it('200 com a OS em diagnóstico e o cliente notificado', async () => {
      mockUpdateWithLock(os);
      clientesRepository.findById.mockResolvedValue({ id: os.cliente_id });

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...os, status: 'EM_DIAGNOSTICO' });
      expect(console.info).toHaveBeenCalledWith(
        `Notificação para o cliente ${os.cliente_id}: Sua ordem de serviço nº 42 está em diagnóstico`,
      );
    });

    it('400 com id inválido', async () => {
      const response = await request(app).post('/api/ordens-servico/abc/iniciar-diagnostico').set(auth);

      expect(response.status).toBe(400);
    });

    it('404 quando a OS não existe', async () => {
      mockUpdateWithLock(null);

      expect((await request(app).post(url).set(auth)).status).toBe(404);
    });

    it('409 quando a OS não está recebida', async () => {
      mockUpdateWithLock(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        erro: 'Só é possível iniciar o diagnóstico de uma ordem de serviço recebida',
      });
      expect(console.info).not.toHaveBeenCalled();
    });
  });
});
