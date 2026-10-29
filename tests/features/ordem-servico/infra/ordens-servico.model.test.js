const { OrdemServico, OrdemServicoHistorico } = require('@src/features/ordem-servico/infra/ordens-servico.model');

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

describe('OrdemServicoHistorico model', () => {
  it('só tem a data da mudança, sem created_at/updated_at', () => {
    const attributes = Object.keys(OrdemServicoHistorico.getAttributes());

    expect(attributes).toEqual(['id', 'ordem_servico_id', 'status_anterior', 'status', 'alterado_em', 'sequencia']);
    expect(OrdemServicoHistorico.getTableName()).toBe('ordens_servico_historico');
  });
});
