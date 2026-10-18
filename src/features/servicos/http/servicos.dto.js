const { z } = require('zod');
const { paginationQueryDto } = require('../../../infra/http/pagination');
const { optionalText } = require('../../../infra/http/dto-helpers');

const createServicoDto = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: optionalText(2000),
});

const updateServicoDto = createServicoDto;

const idParamDto = z.object({
  id: z.uuid(),
});

const listQueryDto = paginationQueryDto.extend({
  nome: z.string().trim().min(1).optional(),
});

module.exports = {
  createServicoDto,
  updateServicoDto,
  idParamDto,
  listQueryDto,
};
