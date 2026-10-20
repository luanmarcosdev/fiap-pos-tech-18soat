const { getClienteById } = require('../clientes');
const ordensServicoRepository = require('./infra/ordens-servico.repository');
const notificador = require('./infra/notificador');
const { NotificarCliente } = require('./application/policies/notificar-cliente');
const { IniciarDiagnostico } = require('./application/iniciar-diagnostico');
const { OrdemServicoController } = require('./http/ordem-servico.controller');
const { createOrdemServicoRouter } = require('./http/ordem-servico.routes');

const notificarCliente = new NotificarCliente({ getClienteById, notificador });
const iniciarDiagnostico = new IniciarDiagnostico({ ordensServicoRepository, notificarCliente });
const ordemServicoController = new OrdemServicoController({ iniciarDiagnostico });

module.exports = {
  routes: createOrdemServicoRouter({ ordemServicoController }),
};
