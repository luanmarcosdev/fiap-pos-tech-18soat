const pecasRepository = require('./infra/pecas.repository');
const { makePecasService } = require('./application/pecas.service');
const { makePecasController } = require('./http/pecas.controller');
const { makePecasRoutes } = require('./http/pecas.routes');

const pecasService = makePecasService({ pecasRepository });
const pecasController = makePecasController({ pecasService });

module.exports = {
  routes: makePecasRoutes({ pecasController }),

  // API pública para o orcamento ("Verificar Estoque" e "Baixar Estoque"). Lançam NotFoundError;
  // consumePecaStock lança ConflictError ('Estoque insuficiente')
  getPecaById: (id) => pecasService.getById(id),
  hasPecaInStock: (id, quantidade) => pecasService.hasStock(id, quantidade),
  consumePecaStock: (id, quantidade) => pecasService.consume(id, quantidade),
};
