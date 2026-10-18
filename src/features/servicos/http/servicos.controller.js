/**
 * Os handlers são arrow functions para manter o `this` quando o Express os recebe soltos:
 * `router.post('/', servicosController.create)`.
 */
class ServicosController {
  #servicosService;

  constructor({ servicosService }) {
    this.#servicosService = servicosService;
  }

  create = async (req, res) => {
    const servico = await this.#servicosService.create(req.body);
    res.status(201).json(servico);
  };

  list = async (req, res) => {
    const servicos = await this.#servicosService.list(req.validatedQuery);
    res.status(200).json(servicos);
  };

  getById = async (req, res) => {
    const servico = await this.#servicosService.getById(req.params.id);
    res.status(200).json(servico);
  };

  update = async (req, res) => {
    const servico = await this.#servicosService.update(req.params.id, req.body);
    res.status(200).json(servico);
  };

  remove = async (req, res) => {
    await this.#servicosService.remove(req.params.id);
    res.status(204).end();
  };
}

module.exports = { ServicosController };
