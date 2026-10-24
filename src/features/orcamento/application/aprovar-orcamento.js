const { NotFoundError } = require('../../../shared/errors');
const { Orcamento } = require('../domain/orcamento.entity');

const NOT_FOUND = 'Orçamento não encontrado';

/**
 * Comando "Aprova Orçamento" (cliente, registrado pelo atendente): o orçamento passa a APROVADO e a policy
 * "Baixar Estoque" tira as peças/insumos do estoque. A OS segue aguardando o "Inicia Manutenção".
 */
class AprovarOrcamento {
  #orcamentosRepository;
  #baixarEstoque;
  #agora;

  constructor({ orcamentosRepository, baixarEstoque, agora = () => new Date() }) {
    this.#orcamentosRepository = orcamentosRepository;
    this.#baixarEstoque = baixarEstoque;
    this.#agora = agora;
  }

  /** A baixa roda depois de gravar, fora da transação: cada peça trava a própria linha no slice pecas. */
  async execute(id) {
    const orcamento = await this.#orcamentosRepository.updateWithLockById(id, (data) => {
      const aprovado = new Orcamento(data);
      aprovado.aprovar(this.#agora());
      return { status: aprovado.status };
    });
    if (!orcamento) throw new NotFoundError(NOT_FOUND);

    return this.#baixarEstoque.execute(orcamento);
  }
}

module.exports = { AprovarOrcamento };
