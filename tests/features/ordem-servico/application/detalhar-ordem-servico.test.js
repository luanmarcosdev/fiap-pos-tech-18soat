const { DetalharOrdemServico } = require('@src/features/ordem-servico/application/detalhar-ordem-servico');
const { NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico({ status: 'AGUARDANDO_APROVACAO' });
const cliente = {
  id: os.cliente_id,
  nome: 'Maria da Silva',
  documento: '52998224725',
  telefone: '11987654321',
  email: 'maria@email.com',
  cep: '01310100',
};
const veiculo = {
  id: os.veiculo_id,
  cliente_id: os.cliente_id,
  placa: 'ABC1D23',
  marca: 'VW',
  modelo: 'Gol',
  ano: 2020,
  cor: 'Prata',
};
const outroVeiculo = { ...veiculo, id: 'c0ffee00-0000-4000-8000-000000000009', placa: 'XYZ9Z99' };
const orcamento = { id: 'orcamento', status: 'ENVIADO', valor_total: 150, servicos: [], pecas: [] };

const setup = ({
  stored = os,
  clienteEncontrado = cliente,
  veiculos = [outroVeiculo, veiculo],
  orcamentoEncontrado = orcamento,
} = {}) => {
  const deps = {
    ordensServicoRepository: { findById: jest.fn().mockResolvedValue(stored) },
    getClienteById: jest.fn().mockResolvedValue(clienteEncontrado),
    listVeiculosByCliente: jest.fn().mockResolvedValue(veiculos),
    getOrcamentoByOrdemServico: jest.fn().mockResolvedValue(orcamentoEncontrado),
  };
  return { useCase: new DetalharOrdemServico(deps), ...deps };
};

describe('DetalharOrdemServico', () => {
  it('devolve a OS com resumo do cliente, do veículo da OS e o orçamento', async () => {
    const { useCase, getClienteById, listVeiculosByCliente, getOrcamentoByOrdemServico } = setup();

    const result = await useCase.execute(os.id);

    expect(getClienteById).toHaveBeenCalledWith(os.cliente_id);
    expect(listVeiculosByCliente).toHaveBeenCalledWith(os.cliente_id);
    expect(getOrcamentoByOrdemServico).toHaveBeenCalledWith(os.id);
    expect(result).toEqual({
      ...os,
      cliente: {
        id: cliente.id,
        nome: 'Maria da Silva',
        documento: '52998224725',
        telefone: '11987654321',
        email: 'maria@email.com',
      },
      veiculo: { id: veiculo.id, placa: 'ABC1D23', marca: 'VW', modelo: 'Gol', ano: 2020 },
      orcamento,
    });
  });

  it('devolve null para cadastros removidos e para OS sem orçamento', async () => {
    const { useCase } = setup({ clienteEncontrado: null, veiculos: [outroVeiculo], orcamentoEncontrado: null });

    await expect(useCase.execute(os.id)).resolves.toMatchObject({ cliente: null, veiculo: null, orcamento: null });
  });

  it('gera NotFoundError sem consultar os outros slices', async () => {
    const { useCase, getClienteById, getOrcamentoByOrdemServico } = setup({ stored: null });

    await expect(useCase.execute(os.id)).rejects.toThrow(new NotFoundError('Ordem de serviço não encontrada'));
    expect(getClienteById).not.toHaveBeenCalled();
    expect(getOrcamentoByOrdemServico).not.toHaveBeenCalled();
  });
});
