const { paginate } = require('../../../shared/pagination');

/** "Listagem de Ordens de Serviço" (gestão administrativa): paginada, mais recentes primeiro. */
class ListarOrdensServico {
  #ordensServicoRepository;

  constructor({ ordensServicoRepository }) {
    this.#ordensServicoRepository = ordensServicoRepository;
  }

  async execute({ page, limit, ...filtros }) {
    const { rows, count } = await this.#ordensServicoRepository.findAll({ page, limit, filtros });
    return paginate(rows, count, page, limit);
  }
}

module.exports = { ListarOrdensServico };
