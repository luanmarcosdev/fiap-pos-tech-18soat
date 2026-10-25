const { ConsultarOrdemServico } = require('@src/features/ordem-servico/application/consultar-ordem-servico');
const { NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico({ status: 'EM_DIAGNOSTICO', diagnostico: 'Pastilhas gastas' });
const cliente = { id: os.cliente_id, nome: 'Maria da Silva', documento: '52998224725' };
const veiculo = { id: os.veiculo_id, cliente_id: os.cliente_id, placa: 'ABC1D23', marca: 'Volkswagen', modelo: 'Gol 1.0', ano: 2020, cor: 'Prata' };
const outroVeiculo = { ...veiculo, id: 'c0ffee00-0000-4000-8000-000000000009', placa: 'XYZ9Z99' };
const consulta = { numero: os.numero, documento: '529.982.247-25' };
// formato devolvido pela API pública do slice orcamento
const orcamento = {
  id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  ordem_servico_id: os.id,
  status: 'ENVIADO',
  valor_total: 199.8,
  expira_em: '2026-11-05T13:00:00.000Z',
  servicos: [{ id: 'i1', servico_id: 's1', nome: 'Troca de pastilhas de freio', valor_unitario: 120 }],
  pecas: [
    {
      id: 'i2',
      peca_id: 'p1',
      codigo: 'PF-001',
      nome: 'Pastilha de freio dianteira',
      tipo: 'PECA',
      unidade_medida: 'UN',
      quantidade: 2,
      valor_unitario: 39.9,
      subtotal: 79.8,
    },
  ],
};

const setup = ({ stored = os, clienteEncontrado = cliente, veiculos = [outroVeiculo, veiculo], orcamentoDaOs = orcamento } = {}) => {
  const ordensServicoRepository = { findByNumero: jest.fn().mockResolvedValue(stored) };
  const getClienteByDocumento = jest.fn().mockResolvedValue(clienteEncontrado);
  const listVeiculosByCliente = jest.fn().mockResolvedValue(veiculos);
  const getOrcamentoEnviadoByOrdemServico = jest.fn().mockResolvedValue(orcamentoDaOs);
  const useCase = new ConsultarOrdemServico({
    ordensServicoRepository,
    getClienteByDocumento,
    listVeiculosByCliente,
    getOrcamentoEnviadoByOrdemServico,
  });
  return {
    useCase,
    ordensServicoRepository,
    getClienteByDocumento,
    listVeiculosByCliente,
    getOrcamentoEnviadoByOrdemServico,
  };
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
      situacao: 'Veículo em diagnóstico',
      queixa: 'Barulho ao frear',
      diagnostico: 'Pastilhas gastas',
      veiculo: { placa: 'ABC1D23', marca: 'Volkswagen', modelo: 'Gol 1.0', ano: 2020 },
      orcamento: null,
      created_at: os.created_at,
      updated_at: os.updated_at,
    });
  });

  it.each(['RECEBIDA', 'EM_DIAGNOSTICO'])('não mostra o rascunho do orçamento com a OS %s', async (status) => {
    const { useCase, getOrcamentoEnviadoByOrdemServico } = setup({ stored: { ...os, status } });

    await expect(useCase.execute(consulta)).resolves.toMatchObject({ orcamento: null });
    expect(getOrcamentoEnviadoByOrdemServico).not.toHaveBeenCalled();
  });

  it('mostra o orçamento enviado com a descrição dos itens, sem ids internos', async () => {
    const { useCase, getOrcamentoEnviadoByOrdemServico } = setup({ stored: { ...os, status: 'AGUARDANDO_APROVACAO' } });

    const result = await useCase.execute(consulta);

    expect(getOrcamentoEnviadoByOrdemServico).toHaveBeenCalledWith(os.id);
    expect(result.orcamento).toEqual({
      status: 'ENVIADO',
      valor_total: 199.8,
      expira_em: '2026-11-05T13:00:00.000Z',
      servicos: [{ nome: 'Troca de pastilhas de freio', valor_unitario: 120 }],
      pecas: [
        {
          nome: 'Pastilha de freio dianteira',
          tipo: 'PECA',
          unidade_medida: 'UN',
          quantidade: 2,
          valor_unitario: 39.9,
          subtotal: 79.8,
        },
      ],
    });
  });

  it('devolve orcamento null quando o slice orcamento não tem orçamento enviado para a OS', async () => {
    const { useCase } = setup({ stored: { ...os, status: 'EM_EXECUCAO' }, orcamentoDaOs: null });

    await expect(useCase.execute(consulta)).resolves.toMatchObject({ orcamento: null });
  });

  it.each([
    ['RECEBIDA', null, 'Ordem de serviço recebida'],
    ['EM_DIAGNOSTICO', null, 'Veículo em diagnóstico'],
    ['AGUARDANDO_APROVACAO', 'ENVIADO', 'Orçamento aguardando sua aprovação'],
    // a OS só sai de AGUARDANDO_APROVACAO no "Inicia Manutenção"
    ['AGUARDANDO_APROVACAO', 'APROVADO', 'Orçamento aprovado. Aguardando o início da manutenção'],
    // reprovado/expirado antes de a policy "Finalizar Ordem de Serviço" terminar
    ['AGUARDANDO_APROVACAO', 'REPROVADO', 'Orçamento reprovado. Ordem de serviço encerrada'],
    ['AGUARDANDO_APROVACAO', 'EXPIRADO', 'Orçamento expirado. Ordem de serviço encerrada'],
    ['EM_EXECUCAO', 'APROVADO', 'Em manutenção'],
    ['FINALIZADA', 'APROVADO', 'Manutenção finalizada'],
    ['FINALIZADA', 'REPROVADO', 'Orçamento reprovado. Ordem de serviço encerrada'],
    ['FINALIZADA', 'EXPIRADO', 'Orçamento expirado. Ordem de serviço encerrada'],
    ['ENTREGUE', 'APROVADO', 'Veículo entregue'],
  ])('com a OS %s e o orçamento %s, a situação é "%s"', async (status, orcamentoStatus, esperada) => {
    const orcamentoDaOs = orcamentoStatus ? { ...orcamento, status: orcamentoStatus } : null;
    const { useCase } = setup({ stored: { ...os, status }, orcamentoDaOs });

    const result = await useCase.execute(consulta);

    expect(result).toMatchObject({ status, situacao: esperada });
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
    const { useCase, listVeiculosByCliente, getOrcamentoEnviadoByOrdemServico } = setup(override);

    await expect(useCase.execute(consulta)).rejects.toThrow(new NotFoundError('Ordem de serviço não encontrada'));
    expect(listVeiculosByCliente).not.toHaveBeenCalled();
    expect(getOrcamentoEnviadoByOrdemServico).not.toHaveBeenCalled();
  });
});
