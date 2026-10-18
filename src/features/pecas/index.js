const pecasRepository = require('./infra/pecas.repository');
const { PecasService } = require('./application/pecas.service');
const { PecasController } = require('./http/pecas.controller');
const { createPecasRouter } = require('./http/pecas.routes');

const pecasService = new PecasService({ pecasRepository });
const pecasController = new PecasController({ pecasService });

module.exports = {
  routes: createPecasRouter({ pecasController }),

  // API pública para o orcamento ("Verificar Estoque" e "Baixar Estoque"). Lançam NotFoundError;
  // baixarEstoquePeca lança ConflictError ('Estoque insuficiente')
  getPecaById: (id) => pecasService.getById(id),
  verificarEstoquePeca: (id, quantidade) => pecasService.verificarEstoque(id, quantidade),
  baixarEstoquePeca: (id, quantidade) => pecasService.baixarEstoque(id, quantidade),
};
