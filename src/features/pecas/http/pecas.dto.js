const { z } = require('zod');
const { paginationQueryDto } = require('../../../infra/http/pagination');
const { optionalText, preco } = require('../../../infra/http/dto-helpers');

const TIPOS = ['PECA', 'INSUMO'];
const codigo = z.string().trim().min(1).max(30).toUpperCase();

const createPecaDto = z.object({
  codigo,
  nome: z.string().trim().min(1).max(120),
  descricao: optionalText(2000),
  tipo: z.enum(TIPOS),
  unidade_medida: z.string().trim().min(1).max(10).toUpperCase().default('UN'),
  preco_unitario: preco(),
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
