const { getClienteById, registerRemovalGuard } = require('../clientes');
const veiculosRepository = require('./infra/veiculos.repository');
const { Placa } = require('./domain/placa.vo');
const { makeVeiculosService } = require('./application/veiculos.service');
const { makeVeiculosController } = require('./http/veiculos.controller');
const { makeVeiculosRoutes } = require('./http/veiculos.routes');

const veiculosService = makeVeiculosService({ veiculosRepository, getClienteById });
const veiculosController = makeVeiculosController({ veiculosService });

// um cliente com veículos ativos não pode ser removido
registerRemovalGuard(async (clienteId) =>
  (await veiculosRepository.countByCliente(clienteId)) > 0 ? 'Cliente possui veículos ativos' : null,
);

module.exports = {
  routes: makeVeiculosRoutes({ veiculosController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getVeiculoByPlaca: (placa) => veiculosRepository.findByPlaca(Placa.normalize(placa)),
  listVeiculosByCliente: (clienteId) => veiculosRepository.findAllByCliente(clienteId),
};
