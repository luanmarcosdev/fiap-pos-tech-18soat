const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { createServicoDto, updateServicoDto, idParamDto, listQueryDto } = require('./servicos.dto');

/**
 * @openapi
 * components:
 *   schemas:
 *     ServicoInput:
 *       type: object
 *       required: [nome, preco]
 *       properties:
 *         nome:
 *           type: string
 *           maxLength: 120
 *           description: 'Único, sem diferenciar maiúsculas'
 *           example: Troca de óleo
 *         descricao:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           example: Troca do óleo do motor e do filtro de óleo
 *         preco:
 *           type: number
 *           minimum: 0
 *           maximum: 99999999.99
 *           description: 'Preço de tabela; o orçamento guarda uma cópia ao incluir o serviço'
 *           example: 120
 *     Servico:
 *       allOf:
 *         - $ref: '#/components/schemas/ServicoInput'
 *         - type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             created_at: { type: string, format: date-time }
 *             updated_at: { type: string, format: date-time }
 *   parameters:
 *     ServicoId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, format: uuid }
 *   responses:
 *     ServicoNaoEncontrado:
 *       description: Serviço não encontrado
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     ServicoDuplicado:
 *       description: Já existe um serviço com este nome
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 */
function createServicosRouter({ servicosController }) {
  const router = Router();

  /**
   * @openapi
   * /servicos:
   *   post:
   *     tags: ['Cadastros · Serviços']
   *     summary: Cadastra um serviço
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ServicoInput' }
   *     responses:
   *       201:
   *         description: Serviço cadastrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Servico' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       409: { $ref: '#/components/responses/ServicoDuplicado' }
   *   get:
   *     tags: ['Cadastros · Serviços']
   *     summary: Lista serviços com paginação e filtro por nome
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
   *       - { in: query, name: nome, description: 'Busca parcial sem diferenciar maiúsculas', schema: { type: string } }
   *     responses:
   *       200:
   *         description: Página de serviços
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Servico' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     page: { type: integer }
   *                     limit: { type: integer }
   *                     total: { type: integer }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   */
  router.post('/', validateRequest({ body: createServicoDto }), servicosController.create);
  router.get('/', validateRequest({ query: listQueryDto }), servicosController.list);

  /**
   * @openapi
   * /servicos/{id}:
   *   get:
   *     tags: ['Cadastros · Serviços']
   *     summary: Busca um serviço pelo id
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/ServicoId' }]
   *     responses:
   *       200:
   *         description: Serviço encontrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Servico' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/ServicoNaoEncontrado' }
   *   put:
   *     tags: ['Cadastros · Serviços']
   *     summary: Atualiza todos os dados de um serviço
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/ServicoId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ServicoInput' }
   *     responses:
   *       200:
   *         description: Serviço atualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Servico' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/ServicoNaoEncontrado' }
   *       409: { $ref: '#/components/responses/ServicoDuplicado' }
   *   delete:
   *     tags: ['Cadastros · Serviços']
   *     summary: Remove um serviço (soft delete)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/ServicoId' }]
   *     responses:
   *       204: { description: Serviço removido }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/ServicoNaoEncontrado' }
   */
  router.get('/:id', validateRequest({ params: idParamDto }), servicosController.getById);
  router.put('/:id', validateRequest({ params: idParamDto, body: updateServicoDto }), servicosController.update);
  router.delete('/:id', validateRequest({ params: idParamDto }), servicosController.remove);

  return router;
}

module.exports = { createServicosRouter };
