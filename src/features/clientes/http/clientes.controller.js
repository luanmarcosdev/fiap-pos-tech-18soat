function makeClientesController({ clientesService }) {
  return {
    async create(req, res) {
      res.status(201).json(await clientesService.create(req.body));
    },

    async list(req, res) {
      res.status(200).json(await clientesService.list(req.validatedQuery));
    },

    async getById(req, res) {
      res.status(200).json(await clientesService.getById(req.params.id));
    },

    async update(req, res) {
      res.status(200).json(await clientesService.update(req.params.id, req.body));
    },

    async remove(req, res) {
      await clientesService.remove(req.params.id);
      res.status(204).end();
    },
  };
}

module.exports = { makeClientesController };
