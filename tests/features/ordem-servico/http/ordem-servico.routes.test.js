jest.mock('@src/features/ordem-servico/infra/ordens-servico.repository');
jest.mock('@src/features/clientes/infra/clientes.repository');
jest.mock('@src/features/veiculos/infra/veiculos.repository');
jest.mock('@src/features/servicos/infra/servicos.repository');
jest.mock('@src/features/orcamento/infra/orcamentos.repository');
jest.mock('@src/features/pecas/infra/pecas.repository');

const request = require('supertest');
const app = require('@src/app');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const clientesRepository = require('@src/features/clientes/infra/clientes.repository');
const veiculosRepository = require('@src/features/veiculos/infra/veiculos.repository');
const servicosRepository = require('@src/features/servicos/infra/servicos.repository');
const orcamentosRepository = require('@src/features/orcamento/infra/orcamentos.repository');
const pecasRepository = require('@src/features/pecas/infra/pecas.repository');
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

  describe('GET / (listagem)', () => {
    it('401 sem token', async () => {
      expect((await request(app).get('/api/ordens-servico')).status).toBe(401);
    });

    it('200 com data e meta, repassando os filtros', async () => {
      ordensServicoRepository.findAll.mockResolvedValue({ rows: [os], count: 1 });

      const response = await request(app).get('/api/ordens-servico?status=RECEBIDA&limit=10').set(auth);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [os], meta: { page: 1, limit: 10, total: 1 } });
      expect(ordensServicoRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtros: { status: 'RECEBIDA' },
      });
    });

    it('400 com status desconhecido', async () => {
      expect((await request(app).get('/api/ordens-servico?status=CANCELADA').set(auth)).status).toBe(400);
    });
  });

  describe('GET /:id (detalhamento)', () => {
    const url = `/api/ordens-servico/${os.id}`;

    it('401 sem token', async () => {
      expect((await request(app).get(url)).status).toBe(401);
    });

    it('200 com cliente, veículo e orçamento', async () => {
      const orcamento = { id: 'orcamento', status: 'EM_DIAGNOSTICO', valor_total: 120, servicos: [], pecas: [] };
      ordensServicoRepository.findById.mockResolvedValue(os);
      clientesRepository.findById.mockResolvedValue({
        id: os.cliente_id,
        nome: 'Maria',
        documento: '52998224725',
        cep: '01310100',
        rua: 'Avenida Paulista',
      });
      veiculosRepository.findAllByCliente.mockResolvedValue([{ id: os.veiculo_id, placa: 'ABC1D23' }]);
      orcamentosRepository.findByOrdemServico.mockResolvedValue(orcamento);

      const response = await request(app).get(url).set(auth);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: os.id,
        cliente: { nome: 'Maria' },
        veiculo: { placa: 'ABC1D23' },
        orcamento,
      });
      // só o resumo do cliente: endereço não sai no detalhe da OS
      expect(response.body.cliente).not.toHaveProperty('cep');
      expect(response.body.cliente).not.toHaveProperty('rua');
    });

    it('400 com id inválido e 404 quando não existe', async () => {
      ordensServicoRepository.findById.mockResolvedValue(null);

      expect((await request(app).get('/api/ordens-servico/abc').set(auth)).status).toBe(400);
      expect((await request(app).get(url).set(auth)).status).toBe(404);
    });
  });

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

  describe('POST /:id/servicos', () => {
    const url = `/api/ordens-servico/${os.id}/servicos`;
    const servico = { id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', nome: 'Troca de óleo', preco: 120 };
    const rascunho = {
      id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
      ordem_servico_id: os.id,
      status: 'EM_DIAGNOSTICO',
      servicos: [],
    };

    const mockOs = (stored) => ordensServicoRepository.findById.mockResolvedValue(stored);
    // o repository mockado executa a mudança sobre o estado informado, como a transação real
    const mockOrcamento = (stored) =>
      orcamentosRepository.addServico.mockImplementation(async (ordemServicoId, change) => {
        const { item, valor_total } = await change(stored);
        return { ...stored, valor_total, servicos: [...stored.servicos, item] };
      });

    it('401 sem token', async () => {
      expect((await request(app).post(url).send({ servico_id: servico.id })).status).toBe(401);
    });

    it('201 com o orçamento e o nome e o preço copiados do catálogo', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      mockOrcamento(rascunho);
      servicosRepository.findById.mockResolvedValue(servico);

      const response = await request(app).post(url).set(auth).send({ servico_id: servico.id });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        ...rascunho,
        valor_total: 120,
        servicos: [{ servico_id: servico.id, nome: 'Troca de óleo', valor_unitario: 120 }],
      });
    });

    it('400 sem servico_id', async () => {
      expect((await request(app).post(url).set(auth).send({})).status).toBe(400);
    });

    it('404 quando a OS não existe', async () => {
      mockOs(null);

      expect((await request(app).post(url).set(auth).send({ servico_id: servico.id })).status).toBe(404);
    });

    it('409 quando a OS não está em diagnóstico', async () => {
      mockOs(buildOrdemServico({ status: 'RECEBIDA' }));

      const response = await request(app).post(url).set(auth).send({ servico_id: servico.id });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'Só é possível adicionar serviços durante o diagnóstico' });
      expect(orcamentosRepository.addServico).not.toHaveBeenCalled();
    });

    it('409 com serviço repetido', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      mockOrcamento({ ...rascunho, servicos: [{ servico_id: servico.id, valor_unitario: 120 }] });
      servicosRepository.findById.mockResolvedValue(servico);

      const response = await request(app).post(url).set(auth).send({ servico_id: servico.id });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'Serviço já adicionado ao orçamento' });
    });

    it('409 quando o orçamento já foi gerado (conclusão concorrente)', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      mockOrcamento({ ...rascunho, status: 'ENVIADO' });
      servicosRepository.findById.mockResolvedValue(servico);

      const response = await request(app).post(url).set(auth).send({ servico_id: servico.id });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'O orçamento já foi gerado e não aceita novos itens' });
    });

    it('422 quando o serviço não existe', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      servicosRepository.findById.mockResolvedValue(null);

      const response = await request(app).post(url).set(auth).send({ servico_id: servico.id });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({ erro: 'Serviço não encontrado' });
      expect(orcamentosRepository.addServico).not.toHaveBeenCalled();
    });
  });

  describe('POST /:id/pecas', () => {
    const url = `/api/ordens-servico/${os.id}/pecas`;
    // registro do slice pecas, sem estoque: adicionar não exige estoque
    const peca = {
      id: '9f8e7d6c-5b4a-4321-8fed-cba987654321',
      codigo: 'FO-010',
      nome: 'Filtro de óleo',
      tipo: 'PECA',
      unidade_medida: 'UN',
      preco_unitario: 39.9,
      quantidade_estoque: 0,
      estoque_minimo: 2,
    };
    const body = { peca_id: peca.id, quantidade: 2 };
    const rascunho = {
      id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
      ordem_servico_id: os.id,
      status: 'EM_DIAGNOSTICO',
      servicos: [],
      pecas: [],
    };

    const mockOs = (stored) => ordensServicoRepository.findById.mockResolvedValue(stored);
    // o repository mockado executa a mudança sobre o estado informado, como a transação real
    const mockOrcamento = (stored) =>
      orcamentosRepository.addPeca.mockImplementation(async (ordemServicoId, change) => {
        const { item, valor_total } = await change(stored);
        return { ...stored, valor_total, pecas: [...stored.pecas, item] };
      });

    it('401 sem token', async () => {
      expect((await request(app).post(url).send(body)).status).toBe(401);
    });

    it('201 com a quantidade e a descrição e o preço copiados do catálogo, mesmo sem estoque', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      mockOrcamento(rascunho);
      pecasRepository.findById.mockResolvedValue(peca);

      const response = await request(app).post(url).set(auth).send(body);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        ...rascunho,
        valor_total: 79.8,
        pecas: [
          {
            peca_id: peca.id,
            codigo: 'FO-010',
            nome: 'Filtro de óleo',
            tipo: 'PECA',
            unidade_medida: 'UN',
            quantidade: 2,
            valor_unitario: 39.9,
          },
        ],
      });
    });

    it('400 com quantidade inválida', async () => {
      const response = await request(app).post(url).set(auth).send({ ...body, quantidade: 0 });

      expect(response.status).toBe(400);
      expect(response.body.detalhes).toEqual([{ campo: 'quantidade', mensagem: expect.any(String) }]);
    });

    it('404 quando a OS não existe', async () => {
      mockOs(null);

      expect((await request(app).post(url).set(auth).send(body)).status).toBe(404);
    });

    it('409 quando a OS não está em diagnóstico', async () => {
      mockOs(buildOrdemServico({ status: 'RECEBIDA' }));

      const response = await request(app).post(url).set(auth).send(body);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'Só é possível adicionar peças e insumos durante o diagnóstico' });
      expect(orcamentosRepository.addPeca).not.toHaveBeenCalled();
    });

    it('409 com peça repetida', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      mockOrcamento({ ...rascunho, pecas: [{ peca_id: peca.id, quantidade: 1, valor_unitario: 39.9 }] });
      pecasRepository.findById.mockResolvedValue(peca);

      const response = await request(app).post(url).set(auth).send(body);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'Peça/insumo já adicionado ao orçamento' });
    });

    it('422 quando a peça não existe', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      pecasRepository.findById.mockResolvedValue(null);

      const response = await request(app).post(url).set(auth).send(body);

      expect(response.status).toBe(422);
      expect(response.body).toEqual({ erro: 'Peça/insumo não encontrado' });
      expect(orcamentosRepository.addPeca).not.toHaveBeenCalled();
    });

    it('422, sem chegar ao banco, quando o total passaria do limite do orçamento', async () => {
      mockOs(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));
      mockOrcamento({ ...rascunho, servicos: [{ servico_id: 's1', valor_unitario: 99999999 }] });
      pecasRepository.findById.mockResolvedValue({ ...peca, preco_unitario: 1 });

      const response = await request(app).post(url).set(auth).send(body);

      expect(response.status).toBe(422);
      expect(response.body).toEqual({ erro: 'O item faria o valor total do orçamento passar do limite permitido' });
    });
  });

  describe('POST /:id/concluir-diagnostico', () => {
    const url = `/api/ordens-servico/${os.id}/concluir-diagnostico`;
    const emDiagnostico = buildOrdemServico({ status: 'EM_DIAGNOSTICO' });
    const rascunho = {
      id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
      ordem_servico_id: os.id,
      status: 'EM_DIAGNOSTICO',
      valor_total: 79.8,
      expira_em: null,
      servicos: [],
      pecas: [
        {
          peca_id: 'pastilha',
          codigo: 'PF-001',
          nome: 'Pastilha de freio',
          tipo: 'PECA',
          unidade_medida: 'UN',
          quantidade: 2,
          valor_unitario: 39.9,
        },
      ],
    };

    // os repositories mockados executam a mudança sobre o estado informado, como as transações reais
    const mockOs = (stored) => {
      ordensServicoRepository.findById.mockResolvedValue(stored);
      ordensServicoRepository.updateWithLock.mockImplementation(async (id, change) =>
        stored ? { ...stored, ...(await change(stored)) } : null,
      );
    };
    const mockOrcamento = (stored) => {
      orcamentosRepository.updateWithLock.mockImplementation(async (ordemServicoId, change) =>
        stored ? { ...stored, ...(await change(stored)) } : null,
      );
      orcamentosRepository.sumReservasByPeca.mockResolvedValue({});
    };

    it('401 sem token', async () => {
      expect((await request(app).post(url).send({ diagnostico: 'ok' })).status).toBe(401);
    });

    it('200 com a OS aguardando aprovação, o orçamento enviado com em_estoque e o cliente notificado', async () => {
      mockOs(emDiagnostico);
      mockOrcamento(rascunho);
      // renomeada no catálogo depois da inclusão: o orçamento mantém o nome copiado
      pecasRepository.findById.mockResolvedValue({ id: 'pastilha', nome: 'Pastilha cerâmica', quantidade_estoque: 0 });
      clientesRepository.findById.mockResolvedValue({ id: os.cliente_id });

      const response = await request(app).post(url).set(auth).send({ diagnostico: ' Pastilhas gastas ' });

      expect(response.status).toBe(200);
      expect(response.body.ordem_servico).toMatchObject({
        status: 'AGUARDANDO_APROVACAO',
        diagnostico: 'Pastilhas gastas',
      });
      expect(response.body.orcamento).toMatchObject({
        status: 'ENVIADO',
        expira_em: expect.any(String),
        pecas: [{ peca_id: 'pastilha', nome: 'Pastilha de freio', em_estoque: false }],
      });
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('aguarda sua aprovação'));
    });

    it('400 sem diagnóstico', async () => {
      expect((await request(app).post(url).set(auth).send({})).status).toBe(400);
    });

    it('404 quando a OS não existe', async () => {
      mockOs(null);

      expect((await request(app).post(url).set(auth).send({ diagnostico: 'ok' })).status).toBe(404);
    });

    it('409, sem gerar orçamento, quando a OS não está em diagnóstico', async () => {
      mockOs(buildOrdemServico({ status: 'RECEBIDA' }));

      const response = await request(app).post(url).set(auth).send({ diagnostico: 'ok' });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        erro: 'Só é possível concluir o diagnóstico de uma ordem de serviço em diagnóstico',
      });
      expect(orcamentosRepository.updateWithLock).not.toHaveBeenCalled();
    });

    it('409, sem mudar a OS, quando o orçamento já foi aprovado/reprovado/expirado', async () => {
      mockOs(emDiagnostico);
      mockOrcamento({ ...rascunho, status: 'APROVADO' });

      const response = await request(app).post(url).set(auth).send({ diagnostico: 'ok' });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ erro: 'O orçamento já foi gerado e não aceita novos itens' });
      expect(ordensServicoRepository.updateWithLock).not.toHaveBeenCalled();
    });

    it('422, sem mudar a OS, quando nenhum item foi adicionado', async () => {
      mockOs(emDiagnostico);
      mockOrcamento(null);

      const response = await request(app).post(url).set(auth).send({ diagnostico: 'ok' });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        erro: 'Adicione ao menos um serviço ou peça/insumo antes de concluir o diagnóstico',
      });
      expect(ordensServicoRepository.updateWithLock).not.toHaveBeenCalled();
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
        orcamento: null,
        created_at: os.created_at,
        updated_at: os.updated_at,
      });
      // a normalização do documento é do slice de clientes
      expect(clientesRepository.findByDocumento).toHaveBeenCalledWith('52998224725');
      expect(orcamentosRepository.findByOrdemServico).not.toHaveBeenCalled();
    });

    it('200 com o orçamento enviado para aprovação, descrito e sem ids internos', async () => {
      ordensServicoRepository.findByNumero.mockResolvedValue({ ...os, status: 'AGUARDANDO_APROVACAO' });
      clientesRepository.findByDocumento.mockResolvedValue({ id: os.cliente_id });
      veiculosRepository.findAllByCliente.mockResolvedValue([veiculo]);
      orcamentosRepository.findByOrdemServico.mockResolvedValue({
        id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
        ordem_servico_id: os.id,
        status: 'ENVIADO',
        valor_total: 199.8,
        expira_em: '2026-11-05T13:00:00.000Z',
        servicos: [{ id: 'i1', servico_id: 's1', nome: 'Troca de pastilhas', valor_unitario: 120 }],
        pecas: [
          {
            id: 'i2',
            peca_id: 'p1',
            codigo: 'PF-001',
            nome: 'Pastilha de freio',
            tipo: 'PECA',
            unidade_medida: 'UN',
            quantidade: 2,
            valor_unitario: 39.9,
            subtotal: 79.8,
          },
        ],
      });

      const response = await request(app).post('/api/ordens-servico/consulta').send(consulta);

      expect(response.status).toBe(200);
      expect(orcamentosRepository.findByOrdemServico).toHaveBeenCalledWith(os.id);
      expect(response.body.orcamento).toEqual({
        status: 'ENVIADO',
        valor_total: 199.8,
        expira_em: '2026-11-05T13:00:00.000Z',
        servicos: [{ nome: 'Troca de pastilhas', valor_unitario: 120 }],
        pecas: [
          {
            nome: 'Pastilha de freio',
            tipo: 'PECA',
            unidade_medida: 'UN',
            quantidade: 2,
            valor_unitario: 39.9,
            subtotal: 79.8,
          },
        ],
      });
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
