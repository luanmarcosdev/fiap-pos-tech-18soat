const { getServicoById } = require('../servicos');
const orcamentosRepository = require('./infra/orcamentos.repository');
const { AdicionarServicoOrcamento } = require('./application/adicionar-servico-orcamento');

const adicionarServicoOrcamento = new AdicionarServicoOrcamento({ orcamentosRepository, getServicoById });

module.exports = {
  // API pública para a ordem de serviço ("Adiciona Serviço"). Lança UnprocessableError (serviço inexistente)
  // e ConflictError (serviço repetido ou orçamento já gerado); devolve o orçamento com os serviços
  adicionarServicoOrcamento: (ordemServicoId, servicoId) => adicionarServicoOrcamento.execute(ordemServicoId, servicoId),
};
