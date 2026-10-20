const MENSAGENS = {
  DiagnosticoIniciado: ({ numero }) => `Sua ordem de serviço nº ${numero} está em diagnóstico`,
};

/**
 * Policy "Notificar Cliente": reage aos eventos da OS e avisa o cliente pelo sistema externo (`notificador`).
 * A notificação é efeito colateral do comando já gravado, então falhas do sistema externo são só registradas;
 * evento sem mensagem é erro de programação e é lançado.
 */
class NotificarCliente {
  #getClienteById;
  #notificador;

  constructor({ getClienteById, notificador }) {
    this.#getClienteById = getClienteById;
    this.#notificador = notificador;
  }

  async execute(evento) {
    const mensagem = MENSAGENS[evento.tipo];
    if (!mensagem) throw new Error(`Evento sem notificação ao cliente: ${evento.tipo}`);

    try {
      const cliente = await this.#getClienteById(evento.clienteId);
      if (!cliente) return;
      await this.#notificador.enviar({ cliente, mensagem: mensagem(evento) });
    } catch (error) {
      console.error(`Falha ao notificar o cliente sobre ${evento.tipo}:`, error);
    }
  }
}

module.exports = { NotificarCliente };
