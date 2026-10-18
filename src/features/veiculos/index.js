const { getClienteById, registerRemovalGuard } = require('../clientes');
const veiculosRepository = require('./infra/veiculos.repository');
const { Placa } = require('./domain/placa.vo');
const { VeiculosService } = require('./application/veiculos.service');
const { VeiculosController } = require('./http/veiculos.controller');
const { createVeiculosRouter } = require('./http/veiculos.routes');

const veiculosService = new VeiculosService({ veiculosRepository, getClienteById });
const veiculosController = new VeiculosController({ veiculosService });

// um cliente com veículos ativos não pode ser removido
registerRemovalGuard(async (clienteId) =>
  (await veiculosRepository.countByCliente(clienteId)) > 0 ? 'Cliente possui veículos ativos' : null,
);

module.exports = {
  routes: createVeiculosRouter({ veiculosController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getVeiculoByPlaca: (placa) => veiculosRepository.findByPlaca(Placa.normalize(placa)),
  listVeiculosByCliente: (clienteId) => veiculosRepository.findAllByCliente(clienteId),
};
