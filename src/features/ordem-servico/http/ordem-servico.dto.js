const { z } = require('zod');
const { paginationQueryDto } = require('../../../infra/http/pagination');
const { STATUS } = require('../domain/ordem-servico.entity');

const idParamDto = z.object({
  id: z.uuid(),
});

// documento com ou sem máscara; a normalização fica com o slice de clientes
const consultaDto = z.object({
  // limite do INTEGER do Postgres: acima disso o banco lançaria erro e a rota aberta responderia 500
  numero: z.number().int().positive().max(2147483647),
  documento: z.string().trim().min(11).max(18),
});

// o veículo precisa ser do cliente: o caso de uso confere (o banco só garante que os dois existem)
const criarDto = z.object({
  cliente_id: z.uuid(),
  veiculo_id: z.uuid(),
  queixa: z.string().trim().min(1).max(5000),
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

const listQueryDto = paginationQueryDto.extend({
  status: z.enum(Object.values(STATUS)).optional(),
  cliente_id: z.uuid().optional(),
  veiculo_id: z.uuid().optional(),
});

// datas de Brasília, inclusivas; sem datas, considera todo o histórico
const tempoMedioQueryDto = z
  .object({
    de: z.iso.date().optional(),
    ate: z.iso.date().optional(),
  })
  .refine(({ de, ate }) => !de || !ate || de <= ate, { message: 'ate não pode ser anterior a de', path: ['ate'] });

module.exports = {
  idParamDto,
  listQueryDto,
  tempoMedioQueryDto,
  consultaDto,
  criarDto,
  adicionarServicoDto,
  adicionarPecaDto,
  concluirDiagnosticoDto,
};
