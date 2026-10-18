const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { createPecaDto, updatePecaDto, entradaDto, idParamDto, listQueryDto } = require('./pecas.dto');

/**
 * @openapi
 * components:
 *   schemas:
 *     PecaInput:
 *       type: object
 *       required: [codigo, nome, tipo, preco_unitario]
 *       properties:
 *         codigo:
 *           type: string
 *           maxLength: 30
 *           description: 'Único entre as peças ativas; salvo em maiúsculas'
 *           example: FLT-OLEO-01
 *         nome: { type: string, maxLength: 120, example: Filtro de óleo }
 *         descricao: { type: string, maxLength: 2000, nullable: true, example: Filtro para motores 1.0 }
 *         tipo: { type: string, enum: [PECA, INSUMO] }
 *         unidade_medida: { type: string, maxLength: 10, default: UN, example: UN }
 *         preco_unitario: { type: number, minimum: 0, maximum: 99999999.99, example: 39.9 }
 *         estoque_minimo: { type: integer, minimum: 0, default: 0, example: 5 }
 *     Peca:
 *       allOf:
 *         - $ref: '#/components/schemas/PecaInput'
 *         - type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             quantidade_estoque: { type: integer, example: 20 }
 *             abaixo_minimo:
 *               type: boolean
 *               description: 'Estoque menor ou igual ao estoque mínimo'
 *             created_at: { type: string, format: date-time }
 *             updated_at: { type: string, format: date-time }
 *   parameters:
 *     PecaId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, format: uuid }
 *   responses:
 *     PecaNaoEncontrada:
 *       description: Peça não encontrada
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     PecaResposta:
 *       description: Peça
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Peca' }
 */
function createPecasRouter({ pecasController }) {
  const router = Router();

  /**
   * @openapi
   * /pecas:
   *   post:
   *     tags: [Pecas]
   *     summary: Cadastra uma peça ou insumo (o estoque começa em zero)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/PecaInput' }
   *     responses:
   *       201:
   *         description: Peça cadastrada
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Peca' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       409:
   *         description: Já existe uma peça com este código
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   *   get:
   *     tags: [Pecas]
   *     summary: Lista peças e insumos com paginação e filtros
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
   *       - { in: query, name: nome, description: 'Busca parcial sem diferenciar maiúsculas nem acentos', schema: { type: string } }
   *       - { in: query, name: codigo, description: 'Código exato', schema: { type: string } }
   *       - { in: query, name: tipo, schema: { type: string, enum: [PECA, INSUMO] } }
   *       - { in: query, name: abaixo_minimo, description: 'true lista só o que está com estoque menor ou igual ao mínimo', schema: { type: boolean } }
   *     responses:
   *       200:
   *         description: Página de peças
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Peca' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     page: { type: integer }
   *                     limit: { type: integer }
   *                     total: { type: integer }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   */
  router.post('/', validateRequest({ body: createPecaDto }), pecasController.create);
  router.get('/', validateRequest({ query: listQueryDto }), pecasController.list);

  /**
   * @openapi
   * /pecas/{id}:
   *   get:
   *     tags: [Pecas]
   *     summary: Busca uma peça pelo id
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/PecaId' }]
   *     responses:
   *       200: { $ref: '#/components/responses/PecaResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/PecaNaoEncontrada' }
   *   put:
   *     tags: [Pecas]
   *     summary: Atualiza dados cadastrais e preço (não altera o estoque)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/PecaId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/PecaInput' }
   *     responses:
   *       200: { $ref: '#/components/responses/PecaResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/PecaNaoEncontrada' }
   *       409:
   *         description: Já existe uma peça com este código
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   *   delete:
   *     tags: [Pecas]
   *     summary: Remove uma peça (soft delete)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/PecaId' }]
   *     responses:
   *       204: { description: Peça removida }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/PecaNaoEncontrada' }
   */
  router.get('/:id', validateRequest({ params: idParamDto }), pecasController.getById);
  router.put('/:id', validateRequest({ params: idParamDto, body: updatePecaDto }), pecasController.update);
  router.delete('/:id', validateRequest({ params: idParamDto }), pecasController.remove);

  /**
   * @openapi
   * /pecas/{id}/entradas:
   *   post:
   *     tags: [Pecas]
   *     summary: Registra uma entrada de estoque (compra ou reposição)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/PecaId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [quantidade]
   *             properties:
   *               quantidade: { type: integer, minimum: 1, maximum: 1000000, example: 10 }
   *     responses:
   *       200: { $ref: '#/components/responses/PecaResposta' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/PecaNaoEncontrada' }
   */
  router.post(
    '/:id/entradas',
    validateRequest({ params: idParamDto, body: entradaDto }),
    pecasController.registrarEntrada,
  );

  return router;
}

module.exports = { createPecasRouter };
