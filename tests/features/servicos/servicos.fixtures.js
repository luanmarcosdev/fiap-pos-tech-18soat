function buildServicoPayload(overrides = {}) {
  return {
    nome: 'Troca de óleo',
    descricao: 'Troca do óleo do motor e do filtro de óleo',
    preco: 120,
    ...overrides,
  };
}

function buildServico(overrides = {}) {
  return {
    id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
    nome: 'Troca de óleo',
    descricao: 'Troca do óleo do motor e do filtro de óleo',
    preco: 120,
    created_at: '2026-10-18T00:00:00.000Z',
    updated_at: '2026-10-18T00:00:00.000Z',
    ...overrides,
  };
}

module.exports = { buildServicoPayload, buildServico };
