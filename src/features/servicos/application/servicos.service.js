const { ConflictError, NotFoundError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');

const NOT_FOUND = 'Serviço não encontrado';
const DUPLICATED = 'Já existe um serviço com este nome';

function makeServicosService({ servicosRepository }) {
  async function getById(id) {
    const servico = await servicosRepository.findById(id);
    if (!servico) throw new NotFoundError(NOT_FOUND);
    return servico;
  }

  return {
    getById,

    async create(payload) {
      if (await servicosRepository.findByNome(payload.nome)) throw new ConflictError(DUPLICATED);
      return servicosRepository.create(payload);
    },

    async list({ page, limit, nome }) {
      const { rows, count } = await servicosRepository.findAll({ page, limit, filtros: { nome } });
      return paginate(rows, count, page, limit);
    },

    async update(id, payload) {
      await getById(id);
      const owner = await servicosRepository.findByNome(payload.nome);
      if (owner && owner.id !== id) throw new ConflictError(DUPLICATED);
      return servicosRepository.update(id, payload);
    },

    async remove(id) {
      const removed = await servicosRepository.delete(id);
      if (!removed) throw new NotFoundError(NOT_FOUND);
    },
  };
}

module.exports = { makeServicosService };
