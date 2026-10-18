const { createVeiculoDto, listQueryDto } = require('@src/features/veiculos/http/veiculos.dto');
const { PLACA, CLIENTE_ID, buildVeiculoPayload } = require('../veiculos.fixtures');

const fieldsWithError = (result) => result.error.issues.map((issue) => issue.path.join('.')).sort();

describe('createVeiculoDto', () => {
  afterEach(() => jest.useRealTimers());

  it('normaliza a placa e transforma cor vazia em null', () => {
    const result = createVeiculoDto.parse(buildVeiculoPayload({ cor: '' }));

    expect(result).toMatchObject({ placa: PLACA, cor: null });
  });

  it('exige os campos obrigatórios', () => {
    expect(fieldsWithError(createVeiculoDto.safeParse({}))).toEqual(['ano', 'cliente_id', 'marca', 'modelo', 'placa']);
  });

  it.each([
    ['placa', { placa: 'ABC123' }],
    ['cliente_id', { cliente_id: '123' }],
    ['ano', { ano: 1899 }],
    ['ano', { ano: 2020.5 }],
    ['ano', { ano: '2020' }],
  ])('rejeita %s inválido (%o)', (campo, override) => {
    expect(fieldsWithError(createVeiculoDto.safeParse(buildVeiculoPayload(override)))).toEqual([campo]);
  });

  it('aceita até o próximo ano, calculado na data atual', () => {
    jest.useFakeTimers({ now: new Date('2026-10-18T12:00:00Z') });

    expect(createVeiculoDto.safeParse(buildVeiculoPayload({ ano: 2027 })).success).toBe(true);
    expect(createVeiculoDto.safeParse(buildVeiculoPayload({ ano: 2028 })).success).toBe(false);
  });
});

describe('listQueryDto', () => {
  it('normaliza a placa e valida cliente_id', () => {
    expect(listQueryDto.parse({ placa: 'abc-1d23', cliente_id: CLIENTE_ID })).toEqual({
      page: 1,
      limit: 20,
      placa: PLACA,
      cliente_id: CLIENTE_ID,
    });
    expect(listQueryDto.safeParse({ cliente_id: 'x' }).success).toBe(false);
  });
});
