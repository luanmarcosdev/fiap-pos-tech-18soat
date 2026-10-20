const { createServicoDto, listQueryDto } = require('@src/features/servicos/http/servicos.dto');
const { buildServicoPayload } = require('../servicos.fixtures');

describe('createServicoDto', () => {
  it('remove espaços do nome e transforma descrição ausente em null', () => {
    expect(createServicoDto.parse({ nome: '  Alinhamento ', preco: 80 })).toEqual({
      nome: 'Alinhamento',
      descricao: null,
      preco: 80,
    });
  });

  it.each([0, 0.1, 19.99, 99999999.99])('aceita preço %p', (preco) => {
    expect(createServicoDto.safeParse(buildServicoPayload({ preco })).success).toBe(true);
  });

  it.each([
    ['nome vazio', { nome: '   ' }],
    ['nome longo', { nome: 'x'.repeat(121) }],
    ['descrição longa', { descricao: 'x'.repeat(2001) }],
    ['preço ausente', { preco: undefined }],
    ['preço negativo', { preco: -1 }],
    ['preço com 3 casas', { preco: 1.999 }],
    ['preço acima do DECIMAL(10,2)', { preco: 100000000 }],
    ['preço em string', { preco: '10' }],
  ])('rejeita %s', (_, override) => {
    expect(createServicoDto.safeParse(buildServicoPayload(override)).success).toBe(false);
  });
});

describe('listQueryDto', () => {
  it('aplica a paginação padrão', () => {
    expect(listQueryDto.parse({ nome: 'óleo' })).toEqual({ page: 1, limit: 20, nome: 'óleo' });
  });
});
