const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { loginDto } = require('./auth.dto');

function createAuthRouter({ authController }) {
  const router = Router();

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: ['Público · Autenticação']
   *     summary: Autentica o usuário e devolve um token JWT
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [usuario, senha]
   *             properties:
   *               usuario:
   *                 type: string
   *                 example: admin
   *               senha:
   *                 type: string
   *                 example: admin
   *     responses:
   *       200:
   *         description: Login realizado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                 tipo:
   *                   type: string
   *                   example: Bearer
   *                 expiraEm:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Payload inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErroValidacao'
   *       401:
   *         description: Credenciais inválidas
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Erro'
   */
  router.post('/auth/login', validateRequest({ body: loginDto }), authController.login);

  return router;
}

module.exports = { createAuthRouter };
