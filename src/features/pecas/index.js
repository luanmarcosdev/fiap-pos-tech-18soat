const pecasRepository = require('./infra/pecas.repository');
const { PecasService } = require('./application/pecas.service');
const { PecasController } = require('./http/pecas.controller');
const { createPecasRouter } = require('./http/pecas.routes');

const pecasService = new PecasService({ pecasRepository });
const pecasController = new PecasController({ pecasService });

module.exports = {
  routes: createPecasRouter({ pecasController }),

  // API pública para o orcamento ("Verificar Estoque" e "Baixar Estoque"). Lançam NotFoundError;
  // consumePecaStock lança ConflictError ('Estoque insuficiente')
  getPecaById: (id) => pecasService.getById(id),
  hasPecaInStock: (id, quantidade) => pecasService.hasStock(id, quantidade),
  consumePecaStock: (id, quantidade) => pecasService.consume(id, quantidade),
};
