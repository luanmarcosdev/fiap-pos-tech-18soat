jest.mock('@src/features/ordem-servico/infra/ordens-servico.repository');
jest.mock('@src/features/clientes/infra/clientes.repository');
jest.mock('@src/features/veiculos/infra/veiculos.repository');
jest.mock('@src/features/servicos/infra/servicos.repository');
jest.mock('@src/features/orcamento/infra/orcamentos.repository');
jest.mock('@src/features/pecas/infra/pecas.repository');

const request = require('supertest');
const app = require('@src/app');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const orcamentosRepository = require('@src/features/orcamento/infra/orcamentos.repository');
const pecasRepository = require('@src/features/pecas/infra/pecas.repository');
const { signToken } = require('@src/features/auth');
const { buildOrdemServico } = require('../../ordem-servico/ordem-servico.fixtures');
const { buildOrcamento, buildOrcamentoPeca } = require('../orcamento.fixtures');

const { token } = signToken({ sub: 'b6f1c0de-0000-4000-8000-000000000001', usuario: 'admin' });
const auth = { Authorization: `Bearer ${token}` };

// vale até bem depois de hoje: os testes não dependem da data em que rodam
const enviado = buildOrcamento({
  status: 'ENVIADO',
  valor_total: 79.8,
  expira_em: '2999-01-01T00:00:00.000Z',
  pecas: [buildOrcamentoPeca({ id: 'item-1', estoque_baixado: null })],
});
const { peca_id: pecaId } = enviado.pecas[0];

// os repositories mockados executam a mudança sobre o estado informado, como a transação real
const mockOrcamento = (stored) =>
  orcamentosRepository.updateWithLockById.mockImplementation(async (id, change) =>
    stored ? { ...stored, ...(await change(stored)) } : null,
  );
const mockPeca = (quantidadeEstoque) =>
  pecasRepository.updateStock.mockImplementation(async (id, change) => {
    const peca = { id, quantidade_estoque: quantidadeEstoque, estoque_minimo: 0 };
    return { ...peca, ...(await change(peca)) };
  });
const mockOrdemServico = (stored) =>
  ordensServicoRepository.updateWithLock.mockImplementation(async (id, change) =>
    stored ? { ...stored, ...(await change(stored)) } : null,
  );

describe('/api/orcamentos', () => {
  beforeEach(() => jest.spyOn(console, 'info').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  describe('POST /:id/aprovar', () => {
    const url = `/api/orcamentos/${enviado.id}/aprovar`;

    it('401 sem token', async () => {
      expect((await request(app).post(url)).status).toBe(401);
    });

    it('200 com o orçamento aprovado e o estoque baixado', async () => {
      mockOrcamento(enviado);
      mockPeca(10);

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'APROVADO', pecas: [{ id: 'item-1', estoque_baixado: true }] });
      expect(pecasRepository.updateStock).toHaveBeenCalledWith(pecaId, expect.any(Function));
      expect(orcamentosRepository.marcarEstoqueBaixado).toHaveBeenCalledWith('item-1', true);
      expect(console.info).not.toHaveBeenCalled();
    });

    it('200 mesmo sem estoque: a peça fica a adquirir e a compra é pedida', async () => {
      mockOrcamento(enviado);
      mockPeca(1);

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(200);
      expect(response.body.pecas[0].estoque_baixado).toBe(false);
      expect(orcamentosRepository.marcarEstoqueBaixado).toHaveBeenCalledWith('item-1', false);
      expect(console.info).toHaveBeenCalledWith(
        `Compra solicitada para o orçamento ${enviado.id}: 2x PF-001 Pastilha de freio dianteira`,
      );
    });

    it('400 com id inválido', async () => {
      expect((await request(app).post('/api/orcamentos/abc/aprovar').set(auth)).status).toBe(400);
    });

    it('404 quando o orçamento não existe', async () => {
      mockOrcamento(null);

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ erro: 'Orçamento não encontrado' });
    });

    it.each([
      ['ainda em diagnóstico', { status: 'EM_DIAGNOSTICO' }, 'O orçamento ainda não foi enviado ao cliente'],
      ['já reprovado', { status: 'REPROVADO' }, 'O orçamento já foi aprovado, reprovado ou expirado'],
      [
        'fora da validade',
        { expira_em: '2020-01-01T00:00:00.000Z' },
        'O orçamento passou da validade e não pode mais ser aprovado ou reprovado',
      ],
    ])('409 com o orçamento %s, sem baixar estoque', async (_, overrides, erro) => {
      mockOrcamento({ ...enviado, ...overrides });

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro });
      expect(pecasRepository.updateStock).not.toHaveBeenCalled();
    });
  });

  describe('POST /:id/reprovar', () => {
    const url = `/api/orcamentos/${enviado.id}/reprovar`;
    const os = buildOrdemServico({ id: enviado.ordem_servico_id, status: 'AGUARDANDO_APROVACAO' });

    it('401 sem token', async () => {
      expect((await request(app).post(url)).status).toBe(401);
    });

    it('200 com o orçamento reprovado e a OS finalizada, sem tocar no estoque', async () => {
      mockOrcamento(enviado);
      mockOrdemServico(os);

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        orcamento: { id: enviado.id, status: 'REPROVADO' },
        ordem_servico: { id: os.id, status: 'FINALIZADA' },
      });
      expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledWith(os.id, expect.any(Function));
      expect(pecasRepository.updateStock).not.toHaveBeenCalled();
    });

    it('404 quando o orçamento não existe', async () => {
      mockOrcamento(null);

      expect((await request(app).post(url).set(auth)).status).toBe(404);
      expect(ordensServicoRepository.updateWithLock).not.toHaveBeenCalled();
    });

    it('409 com o orçamento já aprovado, sem finalizar a OS', async () => {
      mockOrcamento({ ...enviado, status: 'APROVADO' });

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(409);
      expect(ordensServicoRepository.updateWithLock).not.toHaveBeenCalled();
    });

    it('409 quando a OS não está aguardando aprovação', async () => {
      mockOrcamento(enviado);
      mockOrdemServico({ ...os, status: 'EM_DIAGNOSTICO' });

      const response = await request(app).post(url).set(auth);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        erro: 'Só é possível finalizar sem execução uma ordem de serviço aguardando aprovação',
      });
    });
  });
});
