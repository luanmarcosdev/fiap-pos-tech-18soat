const CPF = '52998224725';
const CNPJ = '11222333000181';
const CNPJ_ALFANUMERICO = '12ABC34501DE35';

function buildClientePayload(overrides = {}) {
  return {
    nome: 'Maria da Silva',
    documento: '529.982.247-25',
    email: 'maria@email.com',
    telefone: '(11) 98765-4321',
    cep: '01310-100',
    rua: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Apto 12',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    ...overrides,
  };
}

function buildCliente(overrides = {}) {
  return {
    id: '7d1f3c2a-4b5e-4f60-8a71-92b3c4d5e6f7',
    nome: 'Maria da Silva',
    documento: CPF,
    tipo_pessoa: 'PF',
    email: 'maria@email.com',
    telefone: '11987654321',
    cep: '01310100',
    rua: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Apto 12',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    created_at: '2026-10-18T00:00:00.000Z',
    updated_at: '2026-10-18T00:00:00.000Z',
    ...overrides,
  };
}

module.exports = { CPF, CNPJ, CNPJ_ALFANUMERICO, buildClientePayload, buildCliente };
