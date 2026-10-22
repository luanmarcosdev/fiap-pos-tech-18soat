const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { idParamDto, consultaDto } = require('./ordem-servico.dto');

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
 *     OrdemServicoConsulta:
 *       type: object
 *       description: 'Visão do cliente: sem ids internos nem dados pessoais'
 *       properties:
 *         numero: { type: integer, example: 42 }
 *         status:
 *           type: string
 *           enum: [RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO, EM_EXECUCAO, FINALIZADA, ENTREGUE]
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
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *   parameters:
 *     OrdemServicoId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, format: uuid }
 *   responses:
 *     OrdemServicoResposta:
 *       description: Ordem de serviço
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OrdemServico' }
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
   * /ordens-servico/{id}/iniciar-diagnostico:
   *   post:
   *     tags: [OrdensServico]
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
   *     tags: [OrdensServico]
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
