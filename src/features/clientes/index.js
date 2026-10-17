const clientesRepository = require('./infra/clientes.repository');
const { Documento } = require('./domain/documento.vo');
const { makeClientesService } = require('./application/clientes.service');
const { makeClientesController } = require('./http/clientes.controller');
const { makeClientesRoutes } = require('./http/clientes.routes');

const clientesService = makeClientesService({ clientesRepository });
const clientesController = makeClientesController({ clientesService });

module.exports = {
  routes: makeClientesRoutes({ clientesController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getClienteById: (id) => clientesRepository.findById(id),
  getClienteByDocumento: (documento) => clientesRepository.findByDocumento(Documento.normalize(documento)),
};
