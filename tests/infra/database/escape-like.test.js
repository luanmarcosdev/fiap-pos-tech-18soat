const { escapeLike } = require('@src/infra/database/escape-like');

describe('escapeLike', () => {
  it('escapa os curingas e a barra invertida', () => {
    expect(escapeLike('50%_off\\x')).toBe('50\\%\\_off\\\\x');
  });

  it('mantém texto comum', () => {
    expect(escapeLike('Maria')).toBe('Maria');
  });
});
