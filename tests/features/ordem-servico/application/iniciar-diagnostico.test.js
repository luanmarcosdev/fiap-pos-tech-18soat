const { IniciarDiagnostico } = require('@src/features/ordem-servico/application/iniciar-diagnostico');
const { ConflictError, NotFoundError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const setup = (stored = buildOrdemServico()) => {
  const ordensServicoRepository = {
    // simula a transação: entrega o estado atual para o callback e grava o resultado
    updateWithLock: jest.fn(async (id, change) => (stored ? { ...stored, ...(await change(stored)) } : null)),
  };
  const notificarCliente = { execute: jest.fn() };
  const useCase = new IniciarDiagnostico({ ordensServicoRepository, notificarCliente });
  return { useCase, ordensServicoRepository, notificarCliente };
};

describe('IniciarDiagnostico', () => {
  it('coloca a OS em diagnóstico e notifica o cliente', async () => {
    const { useCase, ordensServicoRepository, notificarCliente } = setup();
    const os = buildOrdemServico();

    const result = await useCase.execute(os.id);

    expect(ordensServicoRepository.updateWithLock).toHaveBeenCalledWith(os.id, expect.any(Function));
    expect(result).toEqual({ ...os, status: 'EM_DIAGNOSTICO' });
    expect(notificarCliente.execute).toHaveBeenCalledWith({
      tipo: 'DiagnosticoIniciado',
      ordemServicoId: os.id,
      numero: os.numero,
      clienteId: os.cliente_id,
    });
  });

  it('gera NotFoundError sem notificar', async () => {
    const { useCase, notificarCliente } = setup(null);

    await expect(useCase.execute('id')).rejects.toThrow(new NotFoundError('Ordem de serviço não encontrada'));
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });

  it('gera ConflictError sem notificar quando a OS não está recebida', async () => {
    const { useCase, notificarCliente } = setup(buildOrdemServico({ status: 'EM_DIAGNOSTICO' }));

    await expect(useCase.execute('id')).rejects.toThrow(ConflictError);
    expect(notificarCliente.execute).not.toHaveBeenCalled();
  });
});
