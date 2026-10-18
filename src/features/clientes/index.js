const clientesRepository = require('./infra/clientes.repository');
const { Documento } = require('./domain/documento.vo');
const { ClientesService } = require('./application/clientes.service');
const { ClientesController } = require('./http/clientes.controller');
const { createClientesRouter } = require('./http/clientes.routes');

const removalGuards = [];
const clientesService = new ClientesService({ clientesRepository, removalGuards });
const clientesController = new ClientesController({ clientesService });

module.exports = {
  routes: createClientesRouter({ clientesController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getClienteById: (id) => clientesRepository.findById(id),
  getClienteByDocumento: (documento) => clientesRepository.findByDocumento(Documento.normalize(documento)),

  /** Permite que outros slices impeçam a remoção de um cliente: `guard(clienteId)` devolve o motivo ou null. */
  registerRemovalGuard: (guard) => removalGuards.push(guard),
};
