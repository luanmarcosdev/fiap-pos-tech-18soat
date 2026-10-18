function buildPecaPayload(overrides = {}) {
  return {
    codigo: 'flt-oleo-01',
    nome: 'Filtro de óleo',
    descricao: 'Filtro para motores 1.0',
    tipo: 'PECA',
    unidade_medida: 'un',
    preco_unitario: 39.9,
    estoque_minimo: 2,
    ...overrides,
  };
}

function buildPeca(overrides = {}) {
  return {
    id: '9f8e7d6c-5b4a-4321-8fed-cba987654321',
    codigo: 'FLT-OLEO-01',
    nome: 'Filtro de óleo',
    descricao: 'Filtro para motores 1.0',
    tipo: 'PECA',
    unidade_medida: 'UN',
    preco_unitario: 39.9,
    quantidade_estoque: 10,
    estoque_minimo: 2,
    created_at: '2026-10-18T00:00:00.000Z',
    updated_at: '2026-10-18T00:00:00.000Z',
    ...overrides,
  };
}

module.exports = { buildPecaPayload, buildPeca };
