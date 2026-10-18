class PecasController {
  #pecasService;

  constructor({ pecasService }) {
    this.#pecasService = pecasService;
  }

  create = async (req, res) => {
    const peca = await this.#pecasService.create(req.body);
    res.status(201).json(peca);
  };

  list = async (req, res) => {
    const pecas = await this.#pecasService.list(req.validatedQuery);
    res.status(200).json(pecas);
  };

  getById = async (req, res) => {
    const peca = await this.#pecasService.getById(req.params.id);
    res.status(200).json(peca);
  };

  update = async (req, res) => {
    const peca = await this.#pecasService.update(req.params.id, req.body);
    res.status(200).json(peca);
  };

  remove = async (req, res) => {
    await this.#pecasService.remove(req.params.id);
    res.status(204).end();
  };

  registerEntry = async (req, res) => {
    const peca = await this.#pecasService.registerEntry(req.params.id, req.body.quantidade);
    res.status(200).json(peca);
  };
}

module.exports = { PecasController };
