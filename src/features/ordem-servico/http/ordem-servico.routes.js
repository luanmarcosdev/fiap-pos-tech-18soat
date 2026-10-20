const { Router } = require('express');
const { validateRequest } = require('../../../infra/http/validate-request');
const { idParamDto } = require('./ordem-servico.dto');

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

module.exports = { createOrdemServicoRouter };
