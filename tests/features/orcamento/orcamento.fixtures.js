const ORDEM_SERVICO_ID = '3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a';

function buildOrcamento(overrides = {}) {
  return {
    id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
    ordem_servico_id: ORDEM_SERVICO_ID,
    status: 'EM_DIAGNOSTICO',
    valor_total: 0,
    expira_em: null,
    servicos: [],
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
    ...overrides,
  };
}

function buildOrcamentoServico(overrides = {}) {
  return {
    servico_id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
    valor_unitario: 120,
    ...overrides,
  };
}

module.exports = { ORDEM_SERVICO_ID, buildOrcamento, buildOrcamentoServico };
