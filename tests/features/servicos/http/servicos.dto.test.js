const { createServicoDto, listQueryDto } = require('@src/features/servicos/http/servicos.dto');
const { buildServicoPayload } = require('../servicos.fixtures');

describe('createServicoDto', () => {
  it('remove espaços do nome e transforma descrição ausente em null', () => {
    expect(createServicoDto.parse({ nome: '  Alinhamento ' })).toEqual({ nome: 'Alinhamento', descricao: null });
  });

  it.each([
    ['nome vazio', { nome: '   ' }],
    ['nome longo', { nome: 'x'.repeat(121) }],
    ['descrição longa', { descricao: 'x'.repeat(2001) }],
  ])('rejeita %s', (_, override) => {
    expect(createServicoDto.safeParse(buildServicoPayload(override)).success).toBe(false);
  });
});

describe('listQueryDto', () => {
  it('aplica a paginação padrão', () => {
    expect(listQueryDto.parse({ nome: 'óleo' })).toEqual({ page: 1, limit: 20, nome: 'óleo' });
  });
});
