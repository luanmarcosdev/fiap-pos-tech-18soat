const servicosRepository = require('./infra/servicos.repository');
const { ServicosService } = require('./application/servicos.service');
const { ServicosController } = require('./http/servicos.controller');
const { createServicosRouter } = require('./http/servicos.routes');

const servicosService = new ServicosService({ servicosRepository });
const servicosController = new ServicosController({ servicosService });

module.exports = {
  routes: createServicosRouter({ servicosController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getServicoById: (id) => servicosRepository.findById(id),
};
