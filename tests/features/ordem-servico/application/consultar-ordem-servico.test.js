const { ConsultarOrdemServico } = require('@src/features/ordem-servico/application/consultar-ordem-servico');
const { NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico({ status: 'EM_DIAGNOSTICO', diagnostico: 'Pastilhas gastas' });
const cliente = { id: os.cliente_id, nome: 'Maria da Silva', documento: '52998224725' };
const veiculo = { id: os.veiculo_id, cliente_id: os.cliente_id, placa: 'ABC1D23', marca: 'Volkswagen', modelo: 'Gol 1.0', ano: 2020, cor: 'Prata' };
const outroVeiculo = { ...veiculo, id: 'c0ffee00-0000-4000-8000-000000000009', placa: 'XYZ9Z99' };
const consulta = { numero: os.numero, documento: '529.982.247-25' };

const setup = ({ stored = os, clienteEncontrado = cliente, veiculos = [outroVeiculo, veiculo] } = {}) => {
  const ordensServicoRepository = { findByNumero: jest.fn().mockResolvedValue(stored) };
  const getClienteByDocumento = jest.fn().mockResolvedValue(clienteEncontrado);
  const listVeiculosByCliente = jest.fn().mockResolvedValue(veiculos);
  const useCase = new ConsultarOrdemServico({ ordensServicoRepository, getClienteByDocumento, listVeiculosByCliente });
  return { useCase, ordensServicoRepository, getClienteByDocumento, listVeiculosByCliente };
};

describe('ConsultarOrdemServico', () => {
  it('devolve a visão do cliente com o veículo da OS, sem ids nem dados pessoais', async () => {
    const { useCase, ordensServicoRepository, getClienteByDocumento, listVeiculosByCliente } = setup();

    const result = await useCase.execute(consulta);

    expect(ordensServicoRepository.findByNumero).toHaveBeenCalledWith(42);
    expect(getClienteByDocumento).toHaveBeenCalledWith('529.982.247-25');
    expect(listVeiculosByCliente).toHaveBeenCalledWith(os.cliente_id);
    expect(result).toEqual({
      numero: 42,
      status: 'EM_DIAGNOSTICO',
      queixa: 'Barulho ao frear',
      diagnostico: 'Pastilhas gastas',
      veiculo: { placa: 'ABC1D23', marca: 'Volkswagen', modelo: 'Gol 1.0', ano: 2020 },
      created_at: os.created_at,
      updated_at: os.updated_at,
    });
  });

  it('devolve veiculo null quando o veículo não está mais ativo', async () => {
    const { useCase } = setup({ veiculos: [outroVeiculo] });

    await expect(useCase.execute(consulta)).resolves.toMatchObject({ veiculo: null });
  });

  it.each([
    ['a OS não existe', { stored: null }],
    ['o documento não é de nenhum cliente', { clienteEncontrado: null }],
    ['o documento é de outro cliente', { clienteEncontrado: { ...cliente, id: 'c0ffee00-0000-4000-8000-000000000001' } }],
  ])('gera o mesmo NotFoundError quando %s', async (_, override) => {
    const { useCase, listVeiculosByCliente } = setup(override);

    await expect(useCase.execute(consulta)).rejects.toThrow(new NotFoundError('Ordem de serviço não encontrada'));
    expect(listVeiculosByCliente).not.toHaveBeenCalled();
  });
});
