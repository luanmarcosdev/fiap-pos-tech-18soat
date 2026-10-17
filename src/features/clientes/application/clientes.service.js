const { ConflictError, NotFoundError } = require('../../../shared/errors');
const { paginate } = require('../../../shared/pagination');
const { Documento } = require('../domain/documento.vo');

const NOT_FOUND = 'Cliente não encontrado';
const DUPLICATED = 'Já existe um cliente com este documento';

function makeClientesService({ clientesRepository }) {
  async function getById(id) {
    const cliente = await clientesRepository.findById(id);
    if (!cliente) throw new NotFoundError(NOT_FOUND);
    return cliente;
  }

  // documento normalizado + tipo_pessoa derivado: o tipo nunca vem do payload
  function withDocumento(payload) {
    const documento = Documento.create(payload.documento);
    return { documento, data: { ...payload, documento: documento.valor, tipo_pessoa: documento.tipoPessoa } };
  }

  return {
    getById,

    async create(payload) {
      const { documento, data } = withDocumento(payload);
      if (await clientesRepository.findByDocumento(documento.valor)) throw new ConflictError(DUPLICATED);
      return clientesRepository.create(data);
    },

    async list({ page, limit, nome, documento }) {
      const { rows, count } = await clientesRepository.findAll({ page, limit, filtros: { nome, documento } });
      return paginate(rows, count, page, limit);
    },

    async update(id, payload) {
      await getById(id);
      const { documento, data } = withDocumento(payload);
      const owner = await clientesRepository.findByDocumento(documento.valor);
      if (owner && owner.id !== id) throw new ConflictError(DUPLICATED);
      return clientesRepository.update(id, data);
    },

    async remove(id) {
      const removed = await clientesRepository.delete(id);
      if (!removed) throw new NotFoundError(NOT_FOUND);
    },
  };
}

module.exports = { makeClientesService };
