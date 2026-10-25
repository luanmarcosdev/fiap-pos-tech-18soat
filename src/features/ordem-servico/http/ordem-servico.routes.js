const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const {
  idParamDto,
  listQueryDto,
  consultaDto,
  criarDto,
  adicionarServicoDto,
  adicionarPecaDto,
  concluirDiagnosticoDto,
} = require('./ordem-servico.dto');

/**
 * @openapi
 * components:
 *   schemas:
 *     OrdemServico:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         numero: { type: integer, description: 'Número curto para o cliente consultar a OS', example: 42 }
 *         cliente_id: { type: string, format: uuid }
 *         veiculo_id: { type: string, format: uuid }
 *         queixa: { type: string, example: Barulho ao frear }
 *         diagnostico: { type: string, nullable: true }
 *         status:
 *           type: string
 *           enum: [RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO, EM_EXECUCAO, FINALIZADA, ENTREGUE]
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     PagamentoConfirmado:
 *       type: object
 *       properties:
 *          osNumber: {type: integer, nullable: false}
 *          success: {type: boolean, nullable: false}
 *     OrdemServicoConsulta:
 *       type: object
 *       description: 'Visão do cliente: sem ids internos nem dados pessoais'
 *       properties:
 *         numero: { type: integer, example: 42 }
 *         status:
 *           type: string
 *           enum: [RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO, EM_EXECUCAO, FINALIZADA, ENTREGUE]
 *         situacao:
 *           type: string
 *           description: >-
 *             Frase para o cliente, a partir do status da OS e do orçamento. A OS continua AGUARDANDO_APROVACAO
 *             depois da aprovação, até o início da manutenção; a situação já mostra o orçamento aprovado.
 *           example: Orçamento aprovado. Aguardando o início da manutenção
 *         queixa: { type: string, example: Barulho ao frear }
 *         diagnostico: { type: string, nullable: true }
 *         veiculo:
 *           type: object
 *           nullable: true
 *           properties:
 *             placa: { type: string, example: ABC1D23 }
 *             marca: { type: string, example: Volkswagen }
 *             modelo: { type: string, example: Gol 1.0 }
 *             ano: { type: integer, example: 2020 }
 *         orcamento:
 *           type: object
 *           nullable: true
 *           description: 'Orçamento enviado para aprovação; null até o diagnóstico ser concluído'
 *           properties:
 *             status: { type: string, enum: [ENVIADO, APROVADO, REPROVADO, EXPIRADO] }
 *             valor_total: { type: number, example: 199.8 }
 *             expira_em: { type: string, format: date-time }
 *             servicos:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nome: { type: string, example: Troca de pastilhas de freio }
 *                   valor_unitario: { type: number, example: 120 }
 *             pecas:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nome: { type: string, example: Pastilha de freio dianteira }
 *                   tipo: { type: string, enum: [PECA, INSUMO] }
 *                   unidade_medida: { type: string, example: UN }
 *                   quantidade: { type: integer, example: 2 }
 *                   valor_unitario: { type: number, example: 39.9 }
 *                   subtotal: { type: number, description: 'quantidade × valor_unitario (calculado)', example: 79.8 }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     OrdemServicoOrcamento:
 *       type: object
 *       description: >-
 *         Orçamento da OS; EM_DIAGNOSTICO enquanto o mecânico adiciona os itens. Preço e descrição de cada item são
 *         copiados do catálogo na inclusão, então mudar ou remover o item do catálogo não altera o orçamento.
 *       properties:
 *         id: { type: string, format: uuid }
 *         ordem_servico_id: { type: string, format: uuid }
 *         status: { type: string, enum: [EM_DIAGNOSTICO, ENVIADO, APROVADO, REPROVADO, EXPIRADO] }
 *         valor_total: { type: number, example: 120 }
 *         expira_em: { type: string, format: date-time, nullable: true }
 *         servicos:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string, format: uuid }
 *               servico_id: { type: string, format: uuid }
 *               nome: { type: string, example: Troca de pastilhas de freio }
 *               valor_unitario: { type: number, description: 'Preço do catálogo no momento da inclusão', example: 120 }
 *         pecas:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string, format: uuid }
 *               peca_id: { type: string, format: uuid }
 *               codigo: { type: string, example: PF-001 }
 *               nome: { type: string, example: Pastilha de freio dianteira }
 *               tipo: { type: string, enum: [PECA, INSUMO] }
 *               unidade_medida: { type: string, example: UN }
 *               quantidade: { type: integer, example: 2 }
 *               valor_unitario: { type: number, description: 'Preço do catálogo no momento da inclusão', example: 39.9 }
 *               subtotal: { type: number, description: 'quantidade × valor_unitario (calculado)', example: 79.8 }
 *               em_estoque:
 *                 type: boolean
 *                 description: 'Só na conclusão: estoque menos reservas de outros orçamentos enviados cobre a quantidade'
 *               estoque_baixado:
 *                 type: boolean
 *                 nullable: true
 *                 description: 'Resultado da aprovação: true = baixado do estoque, false = a adquirir, null = não aprovado'
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     OrdemServicoDetalhe:
 *       allOf:
 *         - $ref: '#/components/schemas/OrdemServico'
 *         - type: object
 *           properties:
 *             cliente:
 *               type: object
 *               nullable: true
 *               description: 'null se o cadastro foi removido depois da abertura da OS'
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 nome: { type: string, example: Maria da Silva }
 *                 documento: { type: string, example: '52998224725' }
 *                 telefone: { type: string, example: '11987654321' }
 *                 email: { type: string, nullable: true, example: maria@email.com }
 *             veiculo:
 *               type: object
 *               nullable: true
 *               description: 'null se o cadastro foi removido ou o veículo passou para outro cliente depois da OS'
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 placa: { type: string, example: ABC1D23 }
 *                 marca: { type: string, example: Volkswagen }
 *                 modelo: { type: string, example: Gol 1.0 }
 *                 ano: { type: integer, example: 2020 }
 *             orcamento:
 *               type: object
 *               allOf: [{ $ref: '#/components/schemas/OrdemServicoOrcamento' }]
 *               nullable: true
 *               description: 'null enquanto nenhum serviço ou peça/insumo foi adicionado'
 *   parameters:
 *     OrdemServicoId:
 *       in: path
 *       name: id
 *       required: true
 *       description: 'Id (uuid) da ordem de serviço, não o número da OS'
 *       schema: { type: string, format: uuid }
 *   responses:
 *     OrdemServicoResposta:
 *       description: Ordem de serviço
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OrdemServico' }
 *       PagamentoConfirmadoResposta:
 *              description: Pagamento Confirmado
 *              content:
 *                application/json:
 *                  schema: { $ref: '#/components/schemas/PagamentoConfirmado' }
 *     OrdemServicoNaoEncontrada:
 *       description: Ordem de serviço não encontrada
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     StatusNaoPermiteComando:
 *       description: O status atual da ordem de serviço não permite o comando
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 */
function createOrdemServicoRouter({ ordemServicoController }) {
  const router = Router();

  /**
   * @openapi
   * /ordens-servico:
   *   get:
   *     tags: ['Gestão · Ordens de Serviço']
   *     summary: Lista ordens de serviço com paginação e filtros (mais recentes primeiro)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO, EM_EXECUCAO, FINALIZADA, ENTREGUE]
   *       - { in: query, name: cliente_id, schema: { type: string, format: uuid } }
   *       - { in: query, name: veiculo_id, schema: { type: string, format: uuid } }
   *     responses:
   *       200:
   *         description: Página de ordens de serviço
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/OrdemServico' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     page: { type: integer }
   *                     limit: { type: integer }
   *                     total: { type: integer }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   */
  router.get('/', validateRequest({ query: listQueryDto }), ordemServicoController.list);

  /**
   * @openapi
   * /ordens-servico:
   *   post:
   *     tags: ['Fluxo da OS · Atendimento']
   *     summary: Cria a ordem de serviço do atendimento (status RECEBIDA) e notifica o cliente
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cliente_id, veiculo_id, queixa]
   *             properties:
   *               cliente_id:
   *                 type: string
   *                 format: uuid
   *                 description: 'Id do cliente (veja GET /clientes?documento=...)'
   *               veiculo_id:
   *                 type: string
   *                 format: uuid
   *                 description: 'Id de um veículo do cliente (veja GET /veiculos?placa=...)'
   *               queixa: { type: string, maxLength: 5000, example: Barulho ao frear }
   *     responses:
   *       201:
   *         description: Ordem de serviço criada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/OrdemServico' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       422:
   *         description: 'Cliente não encontrado, ou o veículo não existe ou não é do cliente'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   */
  router.post('/', validateRequest({ body: criarDto }), ordemServicoController.create);

  /**
   * @openapi
   * /ordens-servico/{id}:
   *   get:
   *     tags: ['Gestão · Ordens de Serviço']
   *     summary: Detalha uma ordem de serviço com cliente, veículo e orçamento
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     responses:
   *       200:
   *         description: Ordem de serviço detalhada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/OrdemServicoDetalhe' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   */
  router.get('/:id', validateRequest({ params: idParamDto }), ordemServicoController.getById);

  /**
   * @openapi
   * /ordens-servico/{id}/iniciar-diagnostico:
   *   post:
   *     tags: ['Fluxo da OS · Diagnóstico']
   *     summary: Inicia o diagnóstico (RECEBIDA → EM_DIAGNOSTICO) e notifica o cliente
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     responses:
   *       200: { $ref: '#/components/responses/OrdemServicoResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409: { $ref: '#/components/responses/StatusNaoPermiteComando' }
   */
  router.post(
    '/:id/iniciar-diagnostico',
    validateRequest({ params: idParamDto }),
    ordemServicoController.iniciarDiagnostico,
  );

   /**
   * @openapi
   * /ordens-servico/{id}/iniciar-manutencao:
   *   post:
   *     tags: ['Fluxo da OS · Manutenção']
   *     summary: Inicia a manutenção (AGUARDANDO_APROVACAO → EM_EXECUCAO) e notifica o cliente
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     responses:
   *       200: { $ref: '#/components/responses/OrdemServicoResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409: { $ref: '#/components/responses/StatusNaoPermiteComando' }
   */
  router.post(
    '/:id/iniciar-manutencao',
    validateRequest({ params: idParamDto }),
    ordemServicoController.iniciarManutencao,
  );

  /**
   * @openapi
   * /ordens-servico/{id}/finalizar-manutencao:
   *   post:
   *     tags: ['Fluxo da OS · Manutenção']
   *     summary: finaliza a manutenção (FINALIZADA) e notifica o cliente
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     responses:
   *       200: { $ref: '#/components/responses/OrdemServicoResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409: { $ref: '#/components/responses/StatusNaoPermiteComando' }
   */
  router.post(
    '/:id/finalizar-manutencao',
    validateRequest({ params: idParamDto }),
    ordemServicoController.finalizarManutencao,
  );

  /**
   * @openapi
   * /ordens-servico/{id}/entregar-veiculo:
   *   post:
   *     tags: ['Fluxo da OS · Veículo']
   *     summary: muda o status da OS para ENTREGUE e notifica o cliente
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     responses:
   *       200: { $ref: '#/components/responses/OrdemServicoResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409: { $ref: '#/components/responses/StatusNaoPermiteComando' }
   */
  router.post(
    '/:id/entregar-veiculo',
    validateRequest({ params: idParamDto }),
    ordemServicoController.entregarVeiculo,
  );

  /**
   * @openapi
   * /ordens-servico/{id}/confirmar-pagamento:
   *   post:
   *     tags: ['Fluxo da OS · Pagamento']
   *     summary: confirma pagamento e notifica o cliente
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     responses:
   *       200:
   *         description: Pagamento Confirmado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PagamentoConfirmado'
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409: { $ref: '#/components/responses/StatusNaoPermiteComando' }
  */
  router.post(
    '/:id/confirmar-pagamento',
    validateRequest({ params: idParamDto }),
    ordemServicoController.confirmarPagamento,
  );

  /**
   * @openapi
   * /ordens-servico/{id}/servicos:
   *   post:
   *     tags: ['Fluxo da OS · Diagnóstico']
   *     summary: Adiciona um serviço ao orçamento da OS em diagnóstico (copia o preço do catálogo)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [servico_id]
   *             properties:
   *               servico_id:
   *                 type: string
   *                 format: uuid
   *                 description: 'Id do serviço do catálogo (veja GET /servicos)'
   *     responses:
   *       201:
   *         description: Orçamento da OS com os serviços
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/OrdemServicoOrcamento' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409:
   *         description: 'OS fora do diagnóstico, serviço já adicionado ou orçamento já gerado'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   *       422:
   *         description: 'Serviço não encontrado, ou o item faria o valor total passar do limite'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   */
  router.post(
    '/:id/servicos',
    validateRequest({ params: idParamDto, body: adicionarServicoDto }),
    ordemServicoController.adicionarServico,
  );

  /**
   * @openapi
   * /ordens-servico/{id}/pecas:
   *   post:
   *     tags: ['Fluxo da OS · Diagnóstico']
   *     summary: Adiciona uma peça/insumo ao orçamento da OS em diagnóstico (o estoque é verificado só ao gerar o orçamento)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [peca_id, quantidade]
   *             properties:
   *               peca_id:
   *                 type: string
   *                 format: uuid
   *                 description: 'Id da peça/insumo do catálogo (veja GET /pecas)'
   *               quantidade: { type: integer, minimum: 1, maximum: 10000, example: 2 }
   *     responses:
   *       201:
   *         description: Orçamento da OS com os itens
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/OrdemServicoOrcamento' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409:
   *         description: 'OS fora do diagnóstico, peça/insumo já adicionado ou orçamento já gerado'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   *       422:
   *         description: 'Peça/insumo não encontrado, ou o item faria o valor total passar do limite'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   */
  router.post(
    '/:id/pecas',
    validateRequest({ params: idParamDto, body: adicionarPecaDto }),
    ordemServicoController.adicionarPeca,
  );

  /**
   * @openapi
   * /ordens-servico/{id}/concluir-diagnostico:
   *   post:
   *     tags: ['Fluxo da OS · Diagnóstico']
   *     summary: Conclui o diagnóstico, gera e envia o orçamento (válido por 14 dias) e notifica o cliente
   *     description: >-
   *       A OS vai de EM_DIAGNOSTICO para AGUARDANDO_APROVACAO e o orçamento para ENVIADO. A verificação de estoque
   *       só informa (em_estoque em cada peça): o que faltar é comprado depois da aprovação.
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrdemServicoId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [diagnostico]
   *             properties:
   *               diagnostico: { type: string, maxLength: 5000, example: Pastilhas de freio gastas e fluido contaminado }
   *     responses:
   *       200:
   *         description: OS aguardando aprovação e o orçamento enviado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ordem_servico: { $ref: '#/components/schemas/OrdemServico' }
   *                 orcamento: { $ref: '#/components/schemas/OrdemServicoOrcamento' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrdemServicoNaoEncontrada' }
   *       409: { $ref: '#/components/responses/StatusNaoPermiteComando' }
   *       422:
   *         description: Nenhum serviço ou peça/insumo foi adicionado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   */
  router.post(
    '/:id/concluir-diagnostico',
    validateRequest({ params: idParamDto, body: concluirDiagnosticoDto }),
    ordemServicoController.concluirDiagnostico,
  );

  return router;
}

/**
 * Rotas abertas ao cliente, montadas sem autenticação.
 * Pendente: limite de tentativas por IP — quem souber o CPF de alguém pode percorrer os números sequenciais.
 */
function createOrdemServicoPublicRouter({ ordemServicoController }) {
  const router = Router();

  /**
   * @openapi
   * /ordens-servico/consulta:
   *   post:
   *     tags: ['Público · Consulta de OS']
   *     summary: Consulta aberta do cliente pelo número da OS e CPF/CNPJ
   *     description: 'POST para o documento não ir na URL (logs e histórico do navegador)'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [numero, documento]
   *             properties:
   *               numero: { type: integer, minimum: 1, example: 42 }
   *               documento: { type: string, description: 'CPF ou CNPJ, com ou sem máscara', example: 529.982.247-25 }
   *     responses:
   *       200:
   *         description: Ordem de serviço
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/OrdemServicoConsulta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       404:
   *         description: 'OS não encontrada ou documento não confere (mesma resposta nos dois casos)'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   */
  router.post('/consulta', validateRequest({ body: consultaDto }), ordemServicoController.consultarOrdemServico);

  return router;
}

module.exports = { createOrdemServicoRouter, createOrdemServicoPublicRouter };
