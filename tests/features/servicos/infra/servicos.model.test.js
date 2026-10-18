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
});
