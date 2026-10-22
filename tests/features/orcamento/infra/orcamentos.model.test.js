const { Orcamento, OrcamentoServico, OrcamentoPeca } = require('@src/features/orcamento/infra/orcamentos.model');

describe('Orcamento model', () => {
  it('usa timestamps em snake_case, começa em EM_DIAGNOSTICO e usa os status do domínio', () => {
    const attributes = Orcamento.getAttributes();

    expect(Object.keys(attributes)).toEqual(expect.arrayContaining(['created_at', 'updated_at']));
    expect(attributes.status.values).toEqual(['EM_DIAGNOSTICO', 'ENVIADO', 'APROVADO', 'REPROVADO', 'EXPIRADO']);
    expect(Orcamento.build({}).toJSON().status).toBe('EM_DIAGNOSTICO');
  });

  it('converte os DECIMAL (string no driver) em número, inclusive nos itens incluídos', () => {
    const json = Orcamento.build(
      {
        valor_total: '310.30',
        servicos: [{ valor_unitario: '150.50' }],
        pecas: [{ quantidade: 2, valor_unitario: '79.90' }],
      },
      { include: [{ association: 'servicos' }, { association: 'pecas' }] },
    ).toJSON();

    expect(json.valor_total).toBe(310.3);
    expect(json.servicos[0].valor_unitario).toBe(150.5);
    expect(json.pecas[0]).toMatchObject({ quantidade: 2, valor_unitario: 79.9 });
  });

  it('mantém valores ausentes', () => {
    expect(OrcamentoServico.build({}).toJSON().valor_unitario).toBeUndefined();
    expect(OrcamentoPeca.build({}).toJSON().valor_unitario).toBeUndefined();
  });

  it('cada model tem o próprio id UUID', () => {
    for (const Model of [Orcamento, OrcamentoServico, OrcamentoPeca]) {
      expect(Model.getAttributes().id).toMatchObject({ primaryKey: true, Model });
    }
  });
});
