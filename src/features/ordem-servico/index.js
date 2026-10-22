const { getClienteById, getClienteByDocumento } = require('../clientes');
const { listVeiculosByCliente } = require('../veiculos');
const ordensServicoRepository = require('./infra/ordens-servico.repository');
const notificador = require('./infra/notificador');
const { NotificarCliente } = require('./application/policies/notificar-cliente');
const { IniciarDiagnostico } = require('./application/iniciar-diagnostico');
const { AdicionarServico } = require('./application/adicionar-servico');
const { AdicionarPeca } = require('./application/adicionar-peca');
const { ConcluirDiagnostico } = require('./application/concluir-diagnostico');
const { ConsultarOrdemServico } = require('./application/consultar-ordem-servico');
const { OrdemServicoController } = require('./http/ordem-servico.controller');
const { createOrdemServicoRouter, createOrdemServicoPublicRouter } = require('./http/ordem-servico.routes');

// require na chamada: o orçamento vai usar a API da OS (mudar o status), e um require circular no topo
// entregaria um módulo vazio a quem fosse carregado por último
const adicionarServicoOrcamento = (...args) => require('../orcamento').adicionarServicoOrcamento(...args);
const adicionarPecaOrcamento = (...args) => require('../orcamento').adicionarPecaOrcamento(...args);
const gerarOrcamento = (...args) => require('../orcamento').gerarOrcamento(...args);

const notificarCliente = new NotificarCliente({ getClienteById, notificador });
const iniciarDiagnostico = new IniciarDiagnostico({ ordensServicoRepository, notificarCliente });
const adicionarServico = new AdicionarServico({ ordensServicoRepository, adicionarServicoOrcamento });
const adicionarPeca = new AdicionarPeca({ ordensServicoRepository, adicionarPecaOrcamento });
const concluirDiagnostico = new ConcluirDiagnostico({ ordensServicoRepository, gerarOrcamento, notificarCliente });
const consultarOrdemServico = new ConsultarOrdemServico({
  ordensServicoRepository,
  getClienteByDocumento,
  listVeiculosByCliente,
});
const ordemServicoController = new OrdemServicoController({
  iniciarDiagnostico,
  adicionarServico,
  adicionarPeca,
  concluirDiagnostico,
  consultarOrdemServico,
});

module.exports = {
  routes: createOrdemServicoRouter({ ordemServicoController }),
  publicRoutes: createOrdemServicoPublicRouter({ ordemServicoController }),
};
