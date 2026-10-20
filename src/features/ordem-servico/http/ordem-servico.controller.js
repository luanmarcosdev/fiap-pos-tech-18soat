class OrdemServicoController {
  #iniciarDiagnostico;

  constructor({ iniciarDiagnostico }) {
    this.#iniciarDiagnostico = iniciarDiagnostico;
  }

  iniciarDiagnostico = async (req, res) => {
    const ordemServico = await this.#iniciarDiagnostico.execute(req.params.id);
    res.status(200).json(ordemServico);
  };
}

module.exports = { OrdemServicoController };
