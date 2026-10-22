const { z } = require('zod');

const idParamDto = z.object({
  id: z.uuid(),
});

// documento com ou sem máscara; a normalização fica com o slice de clientes
const consultaDto = z.object({
  // limite do INTEGER do Postgres: acima disso o banco lançaria erro e a rota aberta responderia 500
  numero: z.number().int().positive().max(2147483647),
  documento: z.string().trim().min(11).max(18),
});

const adicionarServicoDto = z.object({
  servico_id: z.uuid(),
});

module.exports = {
  idParamDto,
  consultaDto,
  adicionarServicoDto,
};
