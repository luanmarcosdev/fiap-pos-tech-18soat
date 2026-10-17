const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { createClienteDto, updateClienteDto, idParamDto, listQueryDto } = require('./clientes.dto');

/**
 * @openapi
 * components:
 *   schemas:
 *     ClienteInput:
 *       type: object
 *       required: [nome, documento, telefone, cep, rua, numero, bairro, cidade, estado]
 *       properties:
 *         nome: { type: string, maxLength: 150, example: Maria da Silva }
 *         documento:
 *           type: string
 *           description: CPF ou CNPJ (inclusive alfanumérico), com ou sem máscara
 *           example: 529.982.247-25
 *         email: { type: string, format: email, nullable: true, example: maria@email.com }
 *         telefone: { type: string, description: 10 ou 11 dígitos, com ou sem máscara, example: (11) 98765-4321 }
 *         cep: { type: string, description: 8 dígitos, com ou sem máscara, example: 01310-100 }
 *         rua: { type: string, maxLength: 150, example: Avenida Paulista }
 *         numero: { type: string, maxLength: 10, example: '1000' }
 *         complemento: { type: string, maxLength: 100, nullable: true, example: Apto 12 }
 *         bairro: { type: string, maxLength: 100, example: Bela Vista }
 *         cidade: { type: string, maxLength: 100, example: São Paulo }
 *         estado: { type: string, description: UF, example: SP }
 *     Cliente:
 *       allOf:
 *         - $ref: '#/components/schemas/ClienteInput'
 *         - type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             documento: { type: string, description: Somente dígitos e letras, example: '52998224725' }
 *             tipo_pessoa: { type: string, enum: [PF, PJ] }
 *             telefone: { type: string, example: '11987654321' }
 *             cep: { type: string, example: '01310100' }
 *             created_at: { type: string, format: date-time }
 *             updated_at: { type: string, format: date-time }
 *   parameters:
 *     ClienteId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, format: uuid }
 *   responses:
 *     NaoAutenticado:
 *       description: Token ausente, inválido ou expirado
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     DadosInvalidos:
 *       description: Dados inválidos
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErroValidacao' }
 *     ClienteNaoEncontrado:
 *       description: Cliente não encontrado
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     DocumentoDuplicado:
 *       description: Já existe um cliente com este documento
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 */
function makeClientesRoutes({ clientesController }) {
  const router = Router();

  /**
   * @openapi
   * /clientes:
   *   post:
   *     tags: [Clientes]
   *     summary: Cadastra um cliente
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ClienteInput' }
   *     responses:
   *       201:
   *         description: Cliente cadastrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Cliente' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       409: { $ref: '#/components/responses/DocumentoDuplicado' }
   *   get:
   *     tags: [Clientes]
   *     summary: Lista clientes com paginação e filtros
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
   *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
   *       - { in: query, name: nome, description: Busca parcial sem diferenciar maiúsculas, schema: { type: string } }
   *       - { in: query, name: documento, description: CPF ou CNPJ exato, com ou sem máscara, schema: { type: string } }
   *     responses:
   *       200:
   *         description: Página de clientes
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Cliente' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     page: { type: integer }
   *                     limit: { type: integer }
   *                     total: { type: integer }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   */
  router.post('/', validateRequest({ body: createClienteDto }), clientesController.create);
  router.get('/', validateRequest({ query: listQueryDto }), clientesController.list);

  /**
   * @openapi
   * /clientes/{id}:
   *   get:
   *     tags: [Clientes]
   *     summary: Busca um cliente pelo id
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/ClienteId' }]
   *     responses:
   *       200:
   *         description: Cliente encontrado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Cliente' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/ClienteNaoEncontrado' }
   *   put:
   *     tags: [Clientes]
   *     summary: Atualiza todos os dados de um cliente
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/ClienteId' }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ClienteInput' }
   *     responses:
   *       200:
   *         description: Cliente atualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Cliente' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/ClienteNaoEncontrado' }
   *       409: { $ref: '#/components/responses/DocumentoDuplicado' }
   *   delete:
   *     tags: [Clientes]
   *     summary: Remove um cliente (soft delete)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/ClienteId' }]
   *     responses:
   *       204: { description: Cliente removido }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/ClienteNaoEncontrado' }
   */
  router.get('/:id', validateRequest({ params: idParamDto }), clientesController.getById);
  router.put('/:id', validateRequest({ params: idParamDto, body: updateClienteDto }), clientesController.update);
  router.delete('/:id', validateRequest({ params: idParamDto }), clientesController.remove);

  return router;
}

module.exports = { makeClientesRoutes };
