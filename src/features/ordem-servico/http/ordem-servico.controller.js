class OrdemServicoController {
  #iniciarDiagnostico;
  #adicionarServico;
  #consultarOrdemServico;

  constructor({ iniciarDiagnostico, adicionarServico, consultarOrdemServico }) {
    this.#iniciarDiagnostico = iniciarDiagnostico;
    this.#adicionarServico = adicionarServico;
    this.#consultarOrdemServico = consultarOrdemServico;
  }

  iniciarDiagnostico = async (req, res) => {
    const ordemServico = await this.#iniciarDiagnostico.execute(req.params.id);
    res.status(200).json(ordemServico);
  };

  adicionarServico = async (req, res) => {
    const orcamento = await this.#adicionarServico.execute(req.params.id, req.body.servico_id);
    res.status(201).json(orcamento);
  };

  consultarOrdemServico = async (req, res) => {
    const ordemServico = await this.#consultarOrdemServico.execute(req.body);
    res.status(200).json(ordemServico);
  };
}

module.exports = { OrdemServicoController };
