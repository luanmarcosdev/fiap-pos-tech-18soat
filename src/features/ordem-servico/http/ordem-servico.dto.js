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

// limite realista para uma OS; o teto do valor total é garantido pelo orçamento
const adicionarPecaDto = z.object({
  peca_id: z.uuid(),
  quantidade: z.number().int().positive().max(10_000),
});

const concluirDiagnosticoDto = z.object({
  diagnostico: z.string().trim().min(1).max(5000),
});

module.exports = {
  idParamDto,
  consultaDto,
  adicionarServicoDto,
  adicionarPecaDto,
  concluirDiagnosticoDto,
};
