const { NotFoundError, ConflictError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');
const { Peca } = require('../domain/peca.entity');

const NOT_FOUND = 'Peça não encontrada';
const DUPLICATED = 'Já existe uma peça com este código';

// campo calculado pela entidade, exposto junto com os dados da peça
function toView(data) {
  return { ...data, abaixo_minimo: new Peca(data).abaixoDoMinimo };
}

function makePecasService({ pecasRepository }) {
  async function findOrFail(id) {
    const data = await pecasRepository.findById(id);
    if (!data) throw new NotFoundError(NOT_FOUND);
    return data;
  }

  async function changeStock(id, operation) {
    const updated = await pecasRepository.updateStock(id, (data) => {
      const peca = new Peca(data);
      operation(peca);
      return peca.toStock();
    });
    if (!updated) throw new NotFoundError(NOT_FOUND);
    return toView(updated);
  }

  return {
    async getById(id) {
      return toView(await findOrFail(id));
    },

    async create(payload) {
      if (await pecasRepository.findByCodigo(payload.codigo)) throw new ConflictError(DUPLICATED);
      return toView(await pecasRepository.create(payload));
    },

    async list({ page, limit, ...filtros }) {
      const { rows, count } = await pecasRepository.findAll({ page, limit, filtros });
      return paginate(rows.map(toView), count, page, limit);
    },

    // dados cadastrais e preço; o estoque só muda pelas operações abaixo
    async update(id, payload) {
      await findOrFail(id);
      const owner = await pecasRepository.findByCodigo(payload.codigo);
      if (owner && owner.id !== id) throw new ConflictError(DUPLICATED);
      return toView(await pecasRepository.update(id, payload));
    },

    async remove(id) {
      const removed = await pecasRepository.delete(id);
      if (!removed) throw new NotFoundError(NOT_FOUND);
    },

    async hasStock(id, quantidade) {
      return new Peca(await findOrFail(id)).hasStock(quantidade);
    },

    registerEntry: (id, quantidade) => changeStock(id, (peca) => peca.registerEntry(quantidade)),
    consume: (id, quantidade) => changeStock(id, (peca) => peca.consume(quantidade)),
  };
}

module.exports = { makePecasService };
