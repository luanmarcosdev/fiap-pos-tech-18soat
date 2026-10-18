const { Peca } = require('@src/features/pecas/infra/pecas.model');

describe('Peca model', () => {
  it('usa timestamps em snake_case', () => {
    expect(Object.keys(Peca.getAttributes())).toEqual(
      expect.arrayContaining(['created_at', 'updated_at', 'deleted_at']),
    );
  });

  it('converte o preço DECIMAL (string no driver) em número e não expõe deleted_at', () => {
    const json = Peca.build({ nome: 'Filtro', preco_unitario: '39.90', deleted_at: new Date() }).toJSON();

    expect(json.preco_unitario).toBe(39.9);
    expect(json).not.toHaveProperty('deleted_at');
  });

  it('mantém preço ausente', () => {
    expect(Peca.build({ nome: 'Filtro' }).toJSON().preco_unitario).toBeUndefined();
  });
});
