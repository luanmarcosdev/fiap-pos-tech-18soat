const { Veiculo } = require('@src/features/veiculos/infra/veiculos.model');

describe('Veiculo model', () => {
  it('usa timestamps em snake_case e não expõe deleted_at', () => {
    const model = Veiculo.build({ placa: 'ABC1234', created_at: new Date(), deleted_at: new Date() });

    expect(Object.keys(Veiculo.getAttributes())).toEqual(
      expect.arrayContaining(['created_at', 'updated_at', 'deleted_at']),
    );
    expect(model.toJSON()).toHaveProperty('created_at');
    expect(model.toJSON()).not.toHaveProperty('deleted_at');
  });
});
