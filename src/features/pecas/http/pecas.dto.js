const { z } = require('zod');
const { paginationQueryDto } = require('../../../infra/http/pagination');
const { optionalText } = require('../../../infra/http/dto-helpers');

const TIPOS = ['PECA', 'INSUMO'];
const PRECO_MAXIMO = 99999999.99; // DECIMAL(10,2)

// compara em centavos para não sofrer com ponto flutuante (ex.: 0.1 + 0.2)
const hasAtMostTwoDecimals = (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const codigo = z.string().trim().min(1).max(30).toUpperCase();

const createPecaDto = z.object({
  codigo,
  nome: z.string().trim().min(1).max(120),
  descricao: optionalText(2000),
  tipo: z.enum(TIPOS),
  unidade_medida: z.string().trim().min(1).max(10).toUpperCase().default('UN'),
  preco_unitario: z
    .number()
    .min(0)
    .max(PRECO_MAXIMO)
    .refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais'),
  estoque_minimo: z.number().int().min(0).default(0),
});

const updatePecaDto = createPecaDto;

const entradaDto = z.object({
  quantidade: z.number().int().positive().max(1_000_000),
});

const idParamDto = z.object({
  id: z.uuid(),
});

const listQueryDto = paginationQueryDto.extend({
  nome: z.string().trim().min(1).optional(),
  codigo: codigo.optional(),
  tipo: z.enum(TIPOS).optional(),
  abaixo_minimo: z.stringbool().optional(),
});

module.exports = {
  TIPOS,
  createPecaDto,
  updatePecaDto,
  entradaDto,
  idParamDto,
  listQueryDto,
};
