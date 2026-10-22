/**
 * Sistema externo de notificação. Por enquanto só registra no log; trocar por e-mail/SMS mantendo `enviar`.
 * Loga só o id do cliente para não espalhar dados pessoais.
 */
async function enviar({ cliente, mensagem }) {
  console.info(`Notificação para o cliente ${cliente.id}: ${mensagem}`);
}

module.exports = { enviar };
