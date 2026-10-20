const { Servico } = require('@src/features/servicos/infra/servicos.model');

describe('Servico model', () => {
  it('usa timestamps em snake_case e não expõe deleted_at', () => {
    const model = Servico.build({ nome: 'Troca de óleo', created_at: new Date(), deleted_at: new Date() });

    expect(Object.keys(Servico.getAttributes())).toEqual(
      expect.arrayContaining(['created_at', 'updated_at', 'deleted_at']),
    );
    expect(model.toJSON()).toHaveProperty('created_at');
    expect(model.toJSON()).not.toHaveProperty('deleted_at');
  });

  it('converte o preço DECIMAL (string no driver) em número', () => {
    expect(Servico.build({ nome: 'Troca de óleo', preco: '120.50' }).toJSON().preco).toBe(120.5);
  });

  it('mantém preço ausente', () => {
    expect(Servico.build({ nome: 'Troca de óleo' }).toJSON().preco).toBeUndefined();
  });
});
