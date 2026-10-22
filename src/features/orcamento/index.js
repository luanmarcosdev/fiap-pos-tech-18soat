const { getServicoById } = require('../servicos');
const { getPecaById } = require('../pecas');
const orcamentosRepository = require('./infra/orcamentos.repository');
const { AdicionarServicoOrcamento } = require('./application/adicionar-servico-orcamento');
const { AdicionarPecaOrcamento } = require('./application/adicionar-peca-orcamento');

const adicionarServicoOrcamento = new AdicionarServicoOrcamento({ orcamentosRepository, getServicoById });
const adicionarPecaOrcamento = new AdicionarPecaOrcamento({ orcamentosRepository, getPecaById });

module.exports = {
  // API pública para a ordem de serviço ("Adiciona Serviço" e "Adiciona Peças/Insumos"). Lançam UnprocessableError
  // (item inexistente) e ConflictError (item repetido ou orçamento já gerado); devolvem o orçamento com os itens
  adicionarServicoOrcamento: (ordemServicoId, servicoId) => adicionarServicoOrcamento.execute(ordemServicoId, servicoId),
  adicionarPecaOrcamento: (ordemServicoId, pecaId, quantidade) =>
    adicionarPecaOrcamento.execute(ordemServicoId, pecaId, quantidade),
};
