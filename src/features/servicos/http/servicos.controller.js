function makeServicosController({ servicosService }) {
  return {
    async create(req, res) {
      res.status(201).json(await servicosService.create(req.body));
    },

    async list(req, res) {
      res.status(200).json(await servicosService.list(req.validatedQuery));
    },

    async getById(req, res) {
      res.status(200).json(await servicosService.getById(req.params.id));
    },

    async update(req, res) {
      res.status(200).json(await servicosService.update(req.params.id, req.body));
    },

    async remove(req, res) {
      await servicosService.remove(req.params.id);
      res.status(204).end();
    },
  };
}

module.exports = { makeServicosController };
