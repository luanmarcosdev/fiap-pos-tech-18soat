function makePecasController({ pecasService }) {
  return {
    async create(req, res) {
      res.status(201).json(await pecasService.create(req.body));
    },

    async list(req, res) {
      res.status(200).json(await pecasService.list(req.validatedQuery));
    },

    async getById(req, res) {
      res.status(200).json(await pecasService.getById(req.params.id));
    },

    async update(req, res) {
      res.status(200).json(await pecasService.update(req.params.id, req.body));
    },

    async remove(req, res) {
      await pecasService.remove(req.params.id);
      res.status(204).end();
    },

    async registerEntry(req, res) {
      res.status(200).json(await pecasService.registerEntry(req.params.id, req.body.quantidade));
    },
  };
}

module.exports = { makePecasController };
