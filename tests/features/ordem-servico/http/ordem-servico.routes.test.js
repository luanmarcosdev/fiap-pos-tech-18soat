jest.mock('@src/features/ordem-servico/infra/ordens-servico.repository');
jest.mock('@src/features/clientes/infra/clientes.repository');
jest.mock('@src/features/veiculos/infra/veiculos.repository');

const request = require('supertest');
const app = require('@src/app');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const clientesRepository = require('@src/features/clientes/infra/clientes.repository');
const veiculosRepository = require('@src/features/veiculos/infra/veiculos.repository');
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

  describe('POST /consulta (aberta)', () => {
    const veiculo = { id: os.veiculo_id, placa: 'ABC1D23', marca: 'Volkswagen', modelo: 'Gol 1.0', ano: 2020 };
    const consulta = { numero: 42, documento: '529.982.247-25' };

    it('200 sem token, com a visão do cliente', async () => {
      ordensServicoRepository.findByNumero.mockResolvedValue(os);
      clientesRepository.findByDocumento.mockResolvedValue({ id: os.cliente_id });
      veiculosRepository.findAllByCliente.mockResolvedValue([veiculo]);

      const response = await request(app).post('/api/ordens-servico/consulta').send(consulta);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        numero: 42,
        status: 'RECEBIDA',
        queixa: 'Barulho ao frear',
        diagnostico: null,
        veiculo: { placa: 'ABC1D23', marca: 'Volkswagen', modelo: 'Gol 1.0', ano: 2020 },
        created_at: os.created_at,
        updated_at: os.updated_at,
      });
      // a normalização do documento é do slice de clientes
      expect(clientesRepository.findByDocumento).toHaveBeenCalledWith('52998224725');
    });

    it.each([
      ['a OS não existe', null, { id: os.cliente_id }],
      ['o documento não é de nenhum cliente', os, null],
      ['o documento é de outro cliente', os, { id: 'c0ffee00-0000-4000-8000-000000000001' }],
    ])('404 idêntico quando %s', async (_, stored, cliente) => {
      ordensServicoRepository.findByNumero.mockResolvedValue(stored);
      clientesRepository.findByDocumento.mockResolvedValue(cliente);

      const response = await request(app).post('/api/ordens-servico/consulta').send(consulta);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ erro: 'Ordem de serviço não encontrada' });
    });

    it('400 sem documento', async () => {
      const response = await request(app).post('/api/ordens-servico/consulta').send({ numero: 42 });

      expect(response.status).toBe(400);
      expect(response.body.detalhes).toEqual([{ campo: 'documento', mensagem: expect.any(String) }]);
    });

    it('não abre as rotas protegidas', async () => {
      expect((await request(app).post(`/api/ordens-servico/${os.id}/iniciar-diagnostico`)).status).toBe(401);
    });
  });
});
