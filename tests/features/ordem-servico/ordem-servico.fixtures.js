function buildOrdemServico(overrides = {}) {
  return {
    id: '3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a',
    numero: 42,
    cliente_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    veiculo_id: '7e8f9a0b-1c2d-4e3f-8a5b-6c7d8e9f0a1b',
    queixa: 'Barulho ao frear',
    diagnostico: null,
    status: 'RECEBIDA',
    created_at: '2026-10-20T00:00:00.000Z',
    updated_at: '2026-10-20T00:00:00.000Z',
    ...overrides,
  };
}

module.exports = { buildOrdemServico };
