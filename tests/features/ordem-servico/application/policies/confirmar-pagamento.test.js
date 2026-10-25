

const { buildOrdemServico } = require('../../ordem-servico.fixtures');
const { ConfirmarPagamento } = require('../../../../../src/features/ordem-servico/application/policies/confirmar-pagamento');
const { NotFoundError } = require('../../../../../src/shared/errors');


const os = buildOrdemServico({ status: 'FINALIZADA', numero: 42 });
const mockNotificacao = { id: 'notificacao-id' };

const setup = ({ stored = os } = {}) => {
  const deps = {
    ordensServicoRepository: {
      findById: jest.fn().mockResolvedValue(stored),
    },
    notificarCliente: { execute: jest.fn().mockResolvedValue(mockNotificacao) },
  };
  return { useCase: new ConfirmarPagamento(deps), ...deps };
};

describe('ConfirmarPagamento', () => {
  it('confirma o pagamento da OS, notifica o cliente e retorna os dados de sucesso', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup();

    const result = await useCase.execute(os.id);

    expect(ordensServicoRepository.findById).toHaveBeenCalledTimes(1);
    expect(ordensServicoRepository.findById).toHaveBeenCalledWith(os.id);
    expect(notificarCliente.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      osNumber: os.numero,
      success: true,
    });
  });

  it('gera NotFoundError quando a ordem de serviço não é encontrada e não notifica o cliente', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup({ stored: null });

    await expect(useCase.execute(os.id)).rejects.toThrow(
      new NotFoundError('Ordem de serviço não encontrada')
    );
    expect(ordensServicoRepository.findById).toHaveBeenCalledTimes(1);
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('propaga erro de domínio se o status atual não permitir confirmar o pagamento', async () => {
    const invalidOs = buildOrdemServico({ status: 'RECEBIDA' });
    const { useCase, notificarCliente } = setup({ stored: invalidOs });

    await expect(useCase.execute(invalidOs.id)).rejects.toThrow();
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });
});