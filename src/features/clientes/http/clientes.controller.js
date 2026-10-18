/**
 * Os handlers são arrow functions para manter o `this` quando o Express os recebe soltos:
 * `router.post('/', clientesController.create)`.
 */
class ClientesController {
  #clientesService;

  constructor({ clientesService }) {
    this.#clientesService = clientesService;
  }

  create = async (req, res) => {
    res.status(201).json(await this.#clientesService.create(req.body));
  };

  list = async (req, res) => {
    res.status(200).json(await this.#clientesService.list(req.validatedQuery));
  };

  getById = async (req, res) => {
    res.status(200).json(await this.#clientesService.getById(req.params.id));
  };

  update = async (req, res) => {
    res.status(200).json(await this.#clientesService.update(req.params.id, req.body));
  };

  remove = async (req, res) => {
    await this.#clientesService.remove(req.params.id);
    res.status(204).end();
  };
}

module.exports = { ClientesController };
