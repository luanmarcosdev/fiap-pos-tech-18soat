const PLACA = 'ABC1D23';
const CLIENTE_ID = '7d1f3c2a-4b5e-4f60-8a71-92b3c4d5e6f7';

function buildVeiculoPayload(overrides = {}) {
  return {
    cliente_id: CLIENTE_ID,
    placa: 'abc-1d23',
    marca: 'Volkswagen',
    modelo: 'Gol 1.0',
    ano: 2020,
    cor: 'Prata',
    ...overrides,
  };
}

function buildVeiculo(overrides = {}) {
  return {
    id: '3e9a1b7c-5d2f-4a8e-9b6c-0d1e2f3a4b5c',
    cliente_id: CLIENTE_ID,
    placa: PLACA,
    marca: 'Volkswagen',
    modelo: 'Gol 1.0',
    ano: 2020,
    cor: 'Prata',
    created_at: '2026-10-18T00:00:00.000Z',
    updated_at: '2026-10-18T00:00:00.000Z',
    ...overrides,
  };
}

module.exports = { PLACA, CLIENTE_ID, buildVeiculoPayload, buildVeiculo };
