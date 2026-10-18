/**
 * Os handlers são arrow functions para manter o `this` quando o Express os recebe soltos:
 * `router.post('/', veiculosController.create)`.
 */
class VeiculosController {
  #veiculosService;

  constructor({ veiculosService }) {
    this.#veiculosService = veiculosService;
  }

  create = async (req, res) => {
    const veiculo = await this.#veiculosService.create(req.body);
    res.status(201).json(veiculo);
  };

  list = async (req, res) => {
    const veiculos = await this.#veiculosService.list(req.validatedQuery);
    res.status(200).json(veiculos);
  };

  getById = async (req, res) => {
    const veiculo = await this.#veiculosService.getById(req.params.id);
    res.status(200).json(veiculo);
  };

  update = async (req, res) => {
    const veiculo = await this.#veiculosService.update(req.params.id, req.body);
    res.status(200).json(veiculo);
  };

  remove = async (req, res) => {
    await this.#veiculosService.remove(req.params.id);
    res.status(204).end();
  };
}

module.exports = { VeiculosController };
