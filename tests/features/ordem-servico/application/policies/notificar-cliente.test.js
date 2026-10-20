const { NotificarCliente } = require('@src/features/ordem-servico/application/policies/notificar-cliente');

const cliente = { id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', nome: 'Maria' };
const diagnosticoIniciado = { tipo: 'DiagnosticoIniciado', ordemServicoId: 'os', numero: 42, clienteId: cliente.id };

const setup = ({ getClienteById = jest.fn().mockResolvedValue(cliente) } = {}) => {
  const notificador = { enviar: jest.fn() };
  return { policy: new NotificarCliente({ getClienteById, notificador }), getClienteById, notificador };
};

describe('NotificarCliente', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('avisa o cliente que a OS está em diagnóstico', async () => {
    const { policy, getClienteById, notificador } = setup();

    await policy.execute(diagnosticoIniciado);

    expect(getClienteById).toHaveBeenCalledWith(cliente.id);
    expect(notificador.enviar).toHaveBeenCalledWith({
      cliente,
      mensagem: 'Sua ordem de serviço nº 42 está em diagnóstico',
    });
  });

  it('não notifica quando o cliente não existe mais', async () => {
    const { policy, notificador } = setup({ getClienteById: jest.fn().mockResolvedValue(null) });

    await policy.execute(diagnosticoIniciado);

    expect(notificador.enviar).not.toHaveBeenCalled();
  });

  it('não propaga falha do sistema externo', async () => {
    const { policy, notificador } = setup();
    notificador.enviar.mockRejectedValue(new Error('SMTP fora do ar'));

    await expect(policy.execute(diagnosticoIniciado)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('lança para evento sem mensagem, em vez de tratá-lo como falha do sistema externo', async () => {
    const { policy, getClienteById } = setup();

    await expect(policy.execute({ ...diagnosticoIniciado, tipo: 'EventoNovo' })).rejects.toThrow(
      'Evento sem notificação ao cliente: EventoNovo',
    );
    expect(getClienteById).not.toHaveBeenCalled();
  });
});
