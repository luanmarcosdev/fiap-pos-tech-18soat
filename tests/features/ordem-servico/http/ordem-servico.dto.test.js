const { consultaDto, adicionarServicoDto } = require('@src/features/ordem-servico/http/ordem-servico.dto');

describe('adicionarServicoDto', () => {
  it('exige servico_id em UUID', () => {
    expect(adicionarServicoDto.safeParse({ servico_id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d' }).success).toBe(true);
    expect(adicionarServicoDto.safeParse({ servico_id: 'abc' }).success).toBe(false);
    expect(adicionarServicoDto.safeParse({}).success).toBe(false);
  });
});

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
