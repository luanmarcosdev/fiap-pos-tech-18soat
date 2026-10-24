const { CriarOrdemServico } = require('@src/features/ordem-servico/application/criar-ordem-servico');
const { UnprocessableError, ValidationError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico();
const input = { cliente_id: os.cliente_id, veiculo_id: os.veiculo_id, queixa: ' Barulho ao frear ' };

const setup = ({ cliente = { id: os.cliente_id }, veiculos = [{ id: os.veiculo_id }] } = {}) => {
  const ordensServicoRepository = { create: jest.fn().mockResolvedValue(os) };
  const getClienteById = jest.fn().mockResolvedValue(cliente);
  const listVeiculosByCliente = jest.fn().mockResolvedValue(veiculos);
  const notificarCliente = { execute: jest.fn() };
  const useCase = new CriarOrdemServico({
    ordensServicoRepository,
    getClienteById,
    listVeiculosByCliente,
    notificarCliente,
  });
  return { useCase, ordensServicoRepository, getClienteById, listVeiculosByCliente, notificarCliente };
};

describe('CriarOrdemServico', () => {
  it('grava a OS RECEBIDA e notifica o cliente', async () => {
    const { useCase, ordensServicoRepository, getClienteById, listVeiculosByCliente, notificarCliente } = setup();

    const result = await useCase.execute(input);

    expect(getClienteById).toHaveBeenCalledWith(os.cliente_id);
    expect(listVeiculosByCliente).toHaveBeenCalledWith(os.cliente_id);
    expect(ordensServicoRepository.create).toHaveBeenCalledWith({
      cliente_id: os.cliente_id,
      veiculo_id: os.veiculo_id,
      queixa: 'Barulho ao frear',
      status: 'RECEBIDA',
    });
    expect(result).toEqual(os);
    expect(notificarCliente.execute).toHaveBeenCalledWith({
      tipo: 'OrdemServicoCriada',
      ordemServicoId: os.id,
      numero: os.numero,
      clienteId: os.cliente_id,
    });
  });

  it('gera ValidationError sem consultar cliente nem veículo quando falta a queixa', async () => {
    const { useCase, getClienteById, ordensServicoRepository } = setup();

    await expect(useCase.execute({ ...input, queixa: '  ' })).rejects.toThrow(ValidationError);
    expect(getClienteById).not.toHaveBeenCalled();
    expect(ordensServicoRepository.create).not.toHaveBeenCalled();
  });

  it('gera UnprocessableError sem gravar quando o cliente não existe', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup({ cliente: null });

    await expect(useCase.execute(input)).rejects.toThrow(new UnprocessableError('Cliente não encontrado'));
    expect(ordensServicoRepository.create).not.toHaveBeenCalled();
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('gera UnprocessableError sem gravar quando o veículo não é do cliente', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup({ veiculos: [{ id: 'outro-veiculo' }] });

    await expect(useCase.execute(input)).rejects.toThrow(
      new UnprocessableError('Veículo não encontrado para o cliente'),
    );
    expect(ordensServicoRepository.create).not.toHaveBeenCalled();
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });
});
