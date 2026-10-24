const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { idParamDto } = require('./orcamento.dto');

/**
 * @openapi
 * components:
 *   parameters:
 *     OrcamentoId:
 *       in: path
 *       name: id
 *       required: true
 *       description: 'Id (uuid) do orçamento (veja o campo orcamento.id em GET /ordens-servico/{id})'
 *       schema: { type: string, format: uuid }
 *   responses:
 *     OrcamentoNaoEncontrado:
 *       description: Orçamento não encontrado
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 *     OrcamentoNaoAceitaDecisao:
 *       description: 'Orçamento ainda não enviado, já decidido/expirado ou fora da validade'
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Erro' }
 */
function createOrcamentoRouter({ orcamentoController }) {
  const router = Router();

  /**
   * @openapi
   * /orcamentos/{id}/aprovar:
   *   post:
   *     tags: [Orcamentos]
   *     summary: Registra a aprovação do cliente (ENVIADO → APROVADO) e baixa o estoque das peças/insumos
   *     description: >-
   *       Peça/insumo sem estoque suficiente não impede a aprovação: fica com estoque_baixado = false e a compra é
   *       pedida ao sistema externo. Repetir a aprovação depois de uma falha só baixa as peças que ficaram pendentes.
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrcamentoId' }]
   *     responses:
   *       200:
   *         description: Orçamento aprovado, com o resultado da baixa em cada peça/insumo
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/OrdemServicoOrcamento' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrcamentoNaoEncontrado' }
   *       409: { $ref: '#/components/responses/OrcamentoNaoAceitaDecisao' }
   */
  router.post('/:id/aprovar', validateRequest({ params: idParamDto }), orcamentoController.aprovar);

  /**
   * @openapi
   * /orcamentos/{id}/reprovar:
   *   post:
   *     tags: [Orcamentos]
   *     summary: Registra a reprovação do cliente (ENVIADO → REPROVADO) e finaliza a ordem de serviço
   *     description: 'A OS vai de AGUARDANDO_APROVACAO para FINALIZADA, sem manutenção; a reserva das peças cai.'
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ $ref: '#/components/parameters/OrcamentoId' }]
   *     responses:
   *       200:
   *         description: Orçamento reprovado e OS finalizada
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 orcamento: { $ref: '#/components/schemas/OrdemServicoOrcamento' }
   *                 ordem_servico: { $ref: '#/components/schemas/OrdemServico' }
   *       400: { $ref: '#/components/responses/DadosInvalidos' }
   *       401: { $ref: '#/components/responses/NaoAutenticado' }
   *       404: { $ref: '#/components/responses/OrcamentoNaoEncontrado' }
   *       409:
   *         description: 'Orçamento não aceita a decisão, ou a OS não está aguardando aprovação'
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Erro' }
   */
  router.post('/:id/reprovar', validateRequest({ params: idParamDto }), orcamentoController.reprovar);

  return router;
}

module.exports = { createOrcamentoRouter };
