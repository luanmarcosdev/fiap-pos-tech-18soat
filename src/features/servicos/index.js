const servicosRepository = require('./infra/servicos.repository');
const { makeServicosService } = require('./application/servicos.service');
const { makeServicosController } = require('./http/servicos.controller');
const { makeServicosRoutes } = require('./http/servicos.routes');

const servicosService = makeServicosService({ servicosRepository });
const servicosController = makeServicosController({ servicosService });

module.exports = {
  routes: makeServicosRoutes({ servicosController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getServicoById: (id) => servicosRepository.findById(id),
};
