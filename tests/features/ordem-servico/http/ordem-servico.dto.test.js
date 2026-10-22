const { consultaDto } = require('@src/features/ordem-servico/http/ordem-servico.dto');

describe('consultaDto', () => {
  it('aceita documento com máscara e remove espaços', () => {
    expect(consultaDto.parse({ numero: 42, documento: ' 529.982.247-25 ' })).toEqual({
      numero: 42,
      documento: '529.982.247-25',
    });
  });

  it.each([
    ['número ausente', { documento: '52998224725' }],
    ['número zero', { numero: 0, documento: '52998224725' }],
    ['número decimal', { numero: 1.5, documento: '52998224725' }],
    ['número em string', { numero: '42', documento: '52998224725' }],
    ['número acima do limite do banco', { numero: 2147483648, documento: '52998224725' }],
    ['documento ausente', { numero: 42 }],
    ['documento curto', { numero: 42, documento: '123' }],
    ['documento longo', { numero: 42, documento: '1'.repeat(19) }],
  ])('rejeita %s', (_, body) => {
    expect(consultaDto.safeParse(body).success).toBe(false);
  });
});
