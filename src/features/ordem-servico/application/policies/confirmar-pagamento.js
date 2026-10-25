
const { NotFoundError } = require('../../../../shared/errors');
const { OrdemServico } = require('../../domain/ordem-servico.entity');



const NOT_FOUND = 'Ordem de serviço não encontrada';

/** Comando "Confirma Pagamento"*/
class ConfirmarPagamento {
  #ordensServicoRepository;
  #notificarCliente;

  constructor({ ordensServicoRepository, notificarCliente }) {
    this.#ordensServicoRepository = ordensServicoRepository;
    this.#notificarCliente = notificarCliente;
  }

  async execute(id) {

    const ordemServico = await this.#ordensServicoRepository.findById(id);
    if (!ordemServico) throw new NotFoundError(NOT_FOUND);
    const os = new OrdemServico(ordemServico);
    os.confirmarPagamento();

    await this.#notificarCliente.execute(os.confirmarPagamento());
    return {
      osNumber: ordemServico.numero,
      success: true,
    };
  }
}

module.exports = { ConfirmarPagamento };
