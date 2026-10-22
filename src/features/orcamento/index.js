const { getServicoById } = require('../servicos');
const { getPecaById } = require('../pecas');
const orcamentosRepository = require('./infra/orcamentos.repository');
const { AdicionarServicoOrcamento } = require('./application/adicionar-servico-orcamento');
const { AdicionarPecaOrcamento } = require('./application/adicionar-peca-orcamento');
const { VerificarEstoque } = require('./application/policies/verificar-estoque');
const { GerarOrcamento } = require('./application/policies/gerar-orcamento');
const { ConsultarOrcamentoEnviado } = require('./application/consultar-orcamento-enviado');

const adicionarServicoOrcamento = new AdicionarServicoOrcamento({ orcamentosRepository, getServicoById });
const adicionarPecaOrcamento = new AdicionarPecaOrcamento({ orcamentosRepository, getPecaById });
const verificarEstoque = new VerificarEstoque({ orcamentosRepository, getPecaById });
const gerarOrcamento = new GerarOrcamento({ orcamentosRepository, verificarEstoque });
const consultarOrcamentoEnviado = new ConsultarOrcamentoEnviado({ orcamentosRepository });

module.exports = {
  // API pública para a ordem de serviço ("Adiciona Serviço" e "Adiciona Peças/Insumos"). Lançam UnprocessableError
  // (item inexistente) e ConflictError (item repetido ou orçamento já gerado); devolvem o orçamento com os itens
  adicionarServicoOrcamento: (ordemServicoId, servicoId) => adicionarServicoOrcamento.execute(ordemServicoId, servicoId),
  adicionarPecaOrcamento: (ordemServicoId, pecaId, quantidade) =>
    adicionarPecaOrcamento.execute(ordemServicoId, pecaId, quantidade),

  // API pública para o "Conclui Diagnóstico": gera e envia o orçamento (idempotente) e devolve os itens com
  // `em_estoque` em cada peça. Lança UnprocessableError (sem itens) e ConflictError (orçamento aprovado/reprovado/expirado)
  gerarOrcamento: (ordemServicoId) => gerarOrcamento.execute(ordemServicoId),

  // detalhamento da OS (atendente/mecânico): orçamento com os itens, inclusive o rascunho, ou null se nenhum item
  // foi adicionado
  getOrcamentoByOrdemServico: (ordemServicoId) => orcamentosRepository.findByOrdemServico(ordemServicoId),

  // consulta aberta da OS (cliente): só o orçamento já enviado; null enquanto for rascunho ou se não existir
  getOrcamentoEnviadoByOrdemServico: (ordemServicoId) => consultarOrcamentoEnviado.execute(ordemServicoId),
};
