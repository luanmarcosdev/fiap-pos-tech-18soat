const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { createVeiculoDto, updateVeiculoDto, idParamDto, listQueryDto } = require('./veiculos.dto');

/**
 * @openapi
 * components:
 *   schemas:
 *     VeiculoInput:
 *       type: object
 *       required: [cliente_id, placa, marca, modelo, ano]
 *       properties:
 *         cliente_id: { type: string, format: uuid }
 *         placa:
 *           type: string
 *           description: Formato antigo (ABC1234) ou Mercosul (ABC1D23), com ou sem hífen
 *           example: ABC-1D23
 *         marca: { type: string, maxLength: 50, example: Volkswagen }
 *         modelo: { type: string, maxLength: 80, example: Gol 1.0 }
 *         ano: { type: integer, minimum: 1900, description: 'Até o próximo ano', example: 2020 }
 *         cor: { type: string, maxLength: 30, nullable: true, example: Prata }
 *     Veiculo:
 *       allOf:
 *         - $ref: '#/components/schemas/VeiculoInput'
 *         - type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             placa: { type: string, example: ABC1D23 }
 *             created_at: { type: string, format: date-time }
 *             updated_at: { type: string, format: date-time }
 *   parameters:
 *     VeiculoId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, format: uuid }
 *   responses:
 *     VeiculoNaoEncontrado:
 *       description: Veículo não encontrado
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     PlacaDuplicada:
 *       description: Já existe um veículo com esta placa
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     ClienteInexistente:
 *       description: O cliente informado não existe
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 */
function createVeiculosRouter({ veiculosController }) {
  const router = Router();

  /**
   * @openapi
   * /veiculos:
   *   post:
   *     tags: ['Cadastros · Veículos']
   *     summary: Cadastra um veículo de um cliente
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/VeiculoInput' }
   *     responses:
   *       201:
   *         description: Veículo cadastrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Veiculo' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       409: { $ref: '#/components/responses/PlacaDuplicada' }
   *       422: { $ref: '#/components/responses/ClienteInexistente' }
   *   get:
   *     tags: ['Cadastros · Veículos']
   *     summary: Lista veículos com paginação e filtros
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
   *       - { in: query, name: cliente_id, schema: { type: string, format: uuid } }
   *       - { in: query, name: placa, description: 'Placa exata, com ou sem hífen', schema: { type: string } }
   *     responses:
   *       200:
   *         description: Página de veículos
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Veiculo' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     page: { type: integer }
   *                     limit: { type: integer }
   *                     total: { type: integer }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   */
  router.post('/', validateRequest({ body: createVeiculoDto }), veiculosController.create);
  router.get('/', validateRequest({ query: listQueryDto }), veiculosController.list);

  /**
   * @openapi
   * /veiculos/{id}:
   *   get:
   *     tags: ['Cadastros · Veículos']
   *     summary: Busca um veículo pelo id
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/VeiculoId' }]
   *     responses:
   *       200:
   *         description: Veículo encontrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Veiculo' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/VeiculoNaoEncontrado' }
   *   put:
   *     tags: ['Cadastros · Veículos']
   *     summary: Atualiza todos os dados de um veículo
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/VeiculoId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/VeiculoInput' }
   *     responses:
   *       200:
   *         description: Veículo atualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Veiculo' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/VeiculoNaoEncontrado' }
   *       409: { $ref: '#/components/responses/PlacaDuplicada' }
   *       422: { $ref: '#/components/responses/ClienteInexistente' }
   *   delete:
   *     tags: ['Cadastros · Veículos']
   *     summary: Remove um veículo (soft delete)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/VeiculoId' }]
   *     responses:
   *       204: { description: Veículo removido }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/VeiculoNaoEncontrado' }
   */
  router.get('/:id', validateRequest({ params: idParamDto }), veiculosController.getById);
  router.put('/:id', validateRequest({ params: idParamDto, body: updateVeiculoDto }), veiculosController.update);
  router.delete('/:id', validateRequest({ params: idParamDto }), veiculosController.remove);

  return router;
}

module.exports = { createVeiculosRouter };
