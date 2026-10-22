class OrdemServicoController {
  #iniciarDiagnostico;
  #consultarOrdemServico;

  constructor({ iniciarDiagnostico, consultarOrdemServico }) {
    this.#iniciarDiagnostico = iniciarDiagnostico;
    this.#consultarOrdemServico = consultarOrdemServico;
  }

  iniciarDiagnostico = async (req, res) => {
    const ordemServico = await this.#iniciarDiagnostico.execute(req.params.id);
    res.status(200).json(ordemServico);
  };

  consultarOrdemServico = async (req, res) => {
    const ordemServico = await this.#consultarOrdemServico.execute(req.body);
    res.status(200).json(ordemServico);
  };
}

module.exports = { OrdemServicoController };
