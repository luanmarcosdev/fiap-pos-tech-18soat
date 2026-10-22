const { Orcamento, OrcamentoServico } = require('@src/features/orcamento/infra/orcamentos.model');

describe('Orcamento model', () => {
  it('usa timestamps em snake_case, começa em EM_DIAGNOSTICO e usa os status do domínio', () => {
    const attributes = Orcamento.getAttributes();

    expect(Object.keys(attributes)).toEqual(expect.arrayContaining(['created_at', 'updated_at']));
    expect(attributes.status.values).toEqual(['EM_DIAGNOSTICO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'EXPIRADO']);
    expect(Orcamento.build({}).toJSON().status).toBe('EM_DIAGNOSTICO');
  });

  it('converte os DECIMAL (string no driver) em número, inclusive nos serviços incluídos', () => {
    const json = Orcamento.build(
      { valor_total: '230.70', servicos: [{ valor_unitario: '150.50' }] },
      { include: [{ association: 'servicos' }] },
    ).toJSON();

    expect(json.valor_total).toBe(230.7);
    expect(json.servicos[0].valor_unitario).toBe(150.5);
  });

  it('mantém valores ausentes', () => {
    expect(OrcamentoServico.build({}).toJSON().valor_unitario).toBeUndefined();
  });
});
