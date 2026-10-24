class OrcamentoController {
  #aprovarOrcamento;
  #reprovarOrcamento;

  constructor({ aprovarOrcamento, reprovarOrcamento }) {
    this.#aprovarOrcamento = aprovarOrcamento;
    this.#reprovarOrcamento = reprovarOrcamento;
  }

  aprovar = async (req, res) => {
    const orcamento = await this.#aprovarOrcamento.execute(req.params.id);
    res.status(200).json(orcamento);
  };

  reprovar = async (req, res) => {
    const resultado = await this.#reprovarOrcamento.execute(req.params.id);
    res.status(200).json(resultado);
  };
}

module.exports = { OrcamentoController };
