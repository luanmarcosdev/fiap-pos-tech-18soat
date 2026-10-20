const { OrdemServico } = require('@src/features/ordem-servico/infra/ordens-servico.model');

describe('OrdemServico model', () => {
  it('usa timestamps em snake_case, sem soft delete', () => {
    const attributes = Object.keys(OrdemServico.getAttributes());

    expect(attributes).toEqual(expect.arrayContaining(['created_at', 'updated_at']));
    expect(attributes).not.toContain('deleted_at');
  });

  it('usa os status do domínio e começa em RECEBIDA', () => {
    const { status } = OrdemServico.getAttributes();

    expect(status.values).toEqual([
      'RECEBIDA',
      'EM_DIAGNOSTICO',
      'AGUARDANDO_APROVACAO',
      'EM_EXECUCAO',
      'FINALIZADA',
      'ENTREGUE',
    ]);
    expect(OrdemServico.build({}).toJSON().status).toBe('RECEBIDA');
  });
});
