const { Placa } = require('@src/features/veiculos/domain/placa.vo');
const { ValidationError } = require('@src/shared/errors');

describe('Placa', () => {
  it.each([
    ['antiga', 'ABC1234'],
    ['antiga com hífen e minúsculas', 'abc-1234'],
    ['Mercosul', 'ABC1D23'],
    ['Mercosul com espaço', 'abc 1d23'],
  ])('aceita placa %s', (_, valor) => {
    expect(Placa.isValid(valor)).toBe(true);
  });

  it.each([
    ['curta', 'ABC123'],
    ['longa', 'ABC12345'],
    ['com número no início', '1BC1234'],
    ['com letra na 4ª posição', 'ABCD123'],
    ['com letra nas duas últimas', 'ABC12D3'],
    ['vazia', ''],
    ['null', null],
  ])('rejeita placa %s', (_, valor) => {
    expect(Placa.isValid(valor)).toBe(false);
  });

  it('normaliza e identifica o formato', () => {
    expect(Placa.create('abc-1d23').valor).toBe('ABC1D23');
    expect(Placa.create('ABC1D23').ehMercosul).toBe(true);
    expect(Placa.create('ABC1234').ehMercosul).toBe(false);
    expect(String(Placa.create('abc1234'))).toBe('ABC1234');
  });

  it('gera ValidationError para placa inválida', () => {
    expect(() => Placa.create('XYZ')).toThrow(ValidationError);
  });

  it('é imutável e compara pelo valor', () => {
    const placa = Placa.create('ABC1234');
    placa.valor = 'outra';

    expect(Object.isFrozen(placa)).toBe(true);
    expect(placa.valor).toBe('ABC1234');
    expect(placa.equals(Placa.create('abc-1234'))).toBe(true);
    expect(placa.equals(Placa.create('ABC1D23'))).toBe(false);
    expect(placa.equals('ABC1234')).toBe(false);
  });
});
