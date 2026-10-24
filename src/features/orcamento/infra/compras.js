/**
 * Sistema externo de compras ("Sistema Externo → Peças/Insumos Adquiridos" no event storming). Por enquanto só
 * registra no log; trocar pela integração com o fornecedor mantendo `solicitar`.
 */
async function solicitar({ orcamentoId, pecas }) {
  const itens = pecas.map(({ codigo, nome, quantidade }) => `${quantidade}x ${codigo} ${nome}`).join(', ');
  console.info(`Compra solicitada para o orçamento ${orcamentoId}: ${itens}`);
}

module.exports = { solicitar };
