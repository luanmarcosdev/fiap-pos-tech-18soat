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
    const cliente = await this.#clientesService.create(req.body);
    res.status(201).json(cliente);
  };

  list = async (req, res) => {
    const clientes = await this.#clientesService.list(req.validatedQuery);
    res.status(200).json(clientes);
  };

  getById = async (req, res) => {
    const cliente = await this.#clientesService.getById(req.params.id);
    res.status(200).json(cliente);
  };

  update = async (req, res) => {
    const cliente = await this.#clientesService.update(req.params.id, req.body);
    res.status(200).json(cliente);
  };

  remove = async (req, res) => {
    await this.#clientesService.remove(req.params.id);
    res.status(204).end();
  };
}

module.exports = { ClientesController };
