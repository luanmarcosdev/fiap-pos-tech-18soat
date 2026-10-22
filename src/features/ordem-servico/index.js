const { getClienteById, getClienteByDocumento } = require('../clientes');
const { listVeiculosByCliente } = require('../veiculos');
const ordensServicoRepository = require('./infra/ordens-servico.repository');
const notificador = require('./infra/notificador');
const { NotificarCliente } = require('./application/policies/notificar-cliente');
const { IniciarDiagnostico } = require('./application/iniciar-diagnostico');
const { ConsultarOrdemServico } = require('./application/consultar-ordem-servico');
const { OrdemServicoController } = require('./http/ordem-servico.controller');
const { createOrdemServicoRouter, createOrdemServicoPublicRouter } = require('./http/ordem-servico.routes');

const notificarCliente = new NotificarCliente({ getClienteById, notificador });
const iniciarDiagnostico = new IniciarDiagnostico({ ordensServicoRepository, notificarCliente });
const consultarOrdemServico = new ConsultarOrdemServico({
  ordensServicoRepository,
  getClienteByDocumento,
  listVeiculosByCliente,
});
const ordemServicoController = new OrdemServicoController({ iniciarDiagnostico, consultarOrdemServico });

module.exports = {
  routes: createOrdemServicoRouter({ ordemServicoController }),
  publicRoutes: createOrdemServicoPublicRouter({ ordemServicoController }),
};
