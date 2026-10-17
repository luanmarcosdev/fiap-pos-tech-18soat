const { Cliente } = require('@src/features/clientes/infra/clientes.model');

describe('Cliente model', () => {
  it('usa timestamps em snake_case', () => {
    expect(Object.keys(Cliente.getAttributes())).toEqual(
      expect.arrayContaining(['created_at', 'updated_at', 'deleted_at']),
    );
  });

  it('não expõe deleted_at no toJSON', () => {
    const model = Cliente.build({ nome: 'Maria', created_at: new Date(), deleted_at: new Date() });

    expect(model.toJSON()).toHaveProperty('nome', 'Maria');
    expect(model.toJSON()).toHaveProperty('created_at');
    expect(model.toJSON()).not.toHaveProperty('deleted_at');
  });
});
