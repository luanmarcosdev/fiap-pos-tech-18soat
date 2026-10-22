class OrdemServicoController {
  #listarOrdensServico;
  #detalharOrdemServico;
  #iniciarDiagnostico;
  #adicionarServico;
  #adicionarPeca;
  #concluirDiagnostico;
  #consultarOrdemServico;

  constructor({
    listarOrdensServico,
    detalharOrdemServico,
    iniciarDiagnostico,
    adicionarServico,
    adicionarPeca,
    concluirDiagnostico,
    consultarOrdemServico,
  }) {
    this.#listarOrdensServico = listarOrdensServico;
    this.#detalharOrdemServico = detalharOrdemServico;
    this.#iniciarDiagnostico = iniciarDiagnostico;
    this.#adicionarServico = adicionarServico;
    this.#adicionarPeca = adicionarPeca;
    this.#concluirDiagnostico = concluirDiagnostico;
    this.#consultarOrdemServico = consultarOrdemServico;
  }

  list = async (req, res) => {
    const ordensServico = await this.#listarOrdensServico.execute(req.validatedQuery);
    res.status(200).json(ordensServico);
  };

  getById = async (req, res) => {
    const ordemServico = await this.#detalharOrdemServico.execute(req.params.id);
    res.status(200).json(ordemServico);
  };

  iniciarDiagnostico = async (req, res) => {
    const ordemServico = await this.#iniciarDiagnostico.execute(req.params.id);
    res.status(200).json(ordemServico);
  };

  adicionarServico = async (req, res) => {
    const orcamento = await this.#adicionarServico.execute(req.params.id, req.body.servico_id);
    res.status(201).json(orcamento);
  };

  adicionarPeca = async (req, res) => {
    const orcamento = await this.#adicionarPeca.execute(req.params.id, req.body);
    res.status(201).json(orcamento);
  };

  concluirDiagnostico = async (req, res) => {
    const resultado = await this.#concluirDiagnostico.execute(req.params.id, req.body);
    res.status(200).json(resultado);
  };

  consultarOrdemServico = async (req, res) => {
    const ordemServico = await this.#consultarOrdemServico.execute(req.body);
    res.status(200).json(ordemServico);
  };
}

module.exports = { OrdemServicoController };
