const { optionalText } = require('@src/infra/http/dto-helpers');

describe('optionalText', () => {
  const schema = optionalText(5);

  it.each([undefined, null, '', '   '])('transforma %p em null', (value) => {
    expect(schema.parse(value)).toBeNull();
  });

  it('remove espaços nas pontas', () => {
    expect(schema.parse('  abc ')).toBe('abc');
  });

  it('respeita o tamanho máximo', () => {
    expect(schema.safeParse('123456').success).toBe(false);
  });
});
