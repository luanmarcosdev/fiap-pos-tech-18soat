function makeVeiculosController({ veiculosService }) {
  return {
    async create(req, res) {
      res.status(201).json(await veiculosService.create(req.body));
    },

    async list(req, res) {
      res.status(200).json(await veiculosService.list(req.validatedQuery));
    },

    async getById(req, res) {
      res.status(200).json(await veiculosService.getById(req.params.id));
    },

    async update(req, res) {
      res.status(200).json(await veiculosService.update(req.params.id, req.body));
    },

    async remove(req, res) {
      await veiculosService.remove(req.params.id);
      res.status(204).end();
    },
  };
}

module.exports = { makeVeiculosController };
