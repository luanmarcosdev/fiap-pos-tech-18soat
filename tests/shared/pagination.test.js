const { buildPage } = require('@src/shared/pagination');

describe('buildPage', () => {
  it('monta data e meta', () => {
    expect(buildPage([{ id: 1 }], 41, 3, 20)).toEqual({
      data: [{ id: 1 }],
      meta: { page: 3, limit: 20, total: 41 },
    });
  });
});
