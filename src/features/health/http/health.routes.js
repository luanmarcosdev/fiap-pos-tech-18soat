const { Router } = require('express');

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: ['Sistema · Health']
 *     summary: Verifica se a API está online
 *     description: Endpoint para verificar se a API está online e funcionando corretamente.
 *     responses:
 *       200:
 *         description: API disponível
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
