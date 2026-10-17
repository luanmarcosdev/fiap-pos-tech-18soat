const { getClienteById } = require('../clientes');
const veiculosRepository = require('./infra/veiculos.repository');
const { Placa } = require('./domain/placa.vo');
const { makeVeiculosService } = require('./application/veiculos.service');
const { makeVeiculosController } = require('./http/veiculos.controller');
const { makeVeiculosRoutes } = require('./http/veiculos.routes');

const veiculosService = makeVeiculosService({ veiculosRepository, getClienteById });
const veiculosController = makeVeiculosController({ veiculosService });

module.exports = {
  routes: makeVeiculosRoutes({ veiculosController }),

  // API pública para outros slices: objetos simples ou null, nunca instâncias do Sequelize
  getVeiculoByPlaca: (placa) => veiculosRepository.findByPlaca(Placa.normalize(placa)),
  listVeiculosByCliente: (clienteId) => veiculosRepository.findAllByCliente(clienteId),
};
