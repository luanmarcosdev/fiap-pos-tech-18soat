const { z } = require('zod');
const { paginationQueryDto } = require('../../../infra/http/pagination');
const { optionalText } = require('../../../infra/http/dto-helpers');
const { Placa } = require('../domain/placa.vo');

const ANO_MINIMO = 1900;

const createVeiculoDto = z.object({
  cliente_id: z.uuid(),
  placa: z.string().transform(Placa.normalize).refine(Placa.isValid, 'Placa inválida (use ABC1234 ou ABC1D23)'),
  marca: z.string().trim().min(1).max(50),
  modelo: z.string().trim().min(1).max(80),
  // o limite superior é calculado a cada requisição para acompanhar a virada do ano
  ano: z
    .number()
    .int()
    .min(ANO_MINIMO)
    .refine((ano) => ano <= new Date().getFullYear() + 1, 'Ano não pode ser maior que o próximo ano'),
  cor: optionalText(30),
});

const updateVeiculoDto = createVeiculoDto;

const idParamDto = z.object({
  id: z.uuid(),
});

const listQueryDto = paginationQueryDto.extend({
  cliente_id: z.uuid().optional(),
  placa: z.string().transform(Placa.normalize).optional(),
});

module.exports = {
  createVeiculoDto,
  updateVeiculoDto,
  idParamDto,
  listQueryDto,
};
