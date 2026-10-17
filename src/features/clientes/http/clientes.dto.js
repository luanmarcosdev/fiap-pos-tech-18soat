const { z } = require('zod');
const { paginationQueryDto } = require('../../../infra/http/pagination');
const { Documento } = require('../domain/documento.vo');

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PR', 'PB', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const onlyDigits = (value) => value.replace(/\D/g, '');

// campos opcionais viram null quando ausentes, já que o PUT substitui o recurso inteiro
const optionalText = (max) => z.string().trim().max(max).nullish().transform((v) => v || null);

const createClienteDto = z.object({
  nome: z.string().trim().min(1).max(150),
  documento: z.string().transform(Documento.normalize).refine(Documento.isValid, 'CPF ou CNPJ inválido'),
  email: z.email().max(150).nullish().transform((v) => v ?? null),
  telefone: z.string().transform(onlyDigits).pipe(z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')),
  cep: z.string().transform(onlyDigits).pipe(z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')),
  rua: z.string().trim().min(1).max(150),
  numero: z.string().trim().min(1).max(10),
  complemento: optionalText(100),
  bairro: z.string().trim().min(1).max(100),
  cidade: z.string().trim().min(1).max(100),
  estado: z.string().trim().toUpperCase().pipe(z.enum(UFS)),
});

const updateClienteDto = createClienteDto;

const idParamDto = z.object({
  id: z.uuid(),
});

const listQueryDto = paginationQueryDto.extend({
  nome: z.string().trim().min(1).optional(),
  documento: z.string().transform(Documento.normalize).optional(),
});

module.exports = {
  UFS,
  createClienteDto,
  updateClienteDto,
  idParamDto,
  listQueryDto,
};
