const { createPecaDto, entradaDto, listQueryDto } = require('@src/features/pecas/http/pecas.dto');
const { buildPecaPayload } = require('../pecas.fixtures');

const fieldsWithError = (result) => result.error.issues.map((issue) => issue.path.join('.')).sort();

describe('createPecaDto', () => {
  it('normaliza código e unidade em maiúsculas', () => {
    expect(createPecaDto.parse(buildPecaPayload())).toMatchObject({ codigo: 'FLT-OLEO-01', unidade_medida: 'UN' });
  });

  it('aplica os padrões e descarta campos de estoque', () => {
    const payload = buildPecaPayload({ quantidade_estoque: 99 });
    delete payload.unidade_medida;
    delete payload.estoque_minimo;
    delete payload.descricao;

    const result = createPecaDto.parse(payload);

    expect(result).toMatchObject({ unidade_medida: 'UN', estoque_minimo: 0, descricao: null });
    expect(result).not.toHaveProperty('quantidade_estoque');
  });

  it('exige os campos obrigatórios', () => {
    expect(fieldsWithError(createPecaDto.safeParse({}))).toEqual(['codigo', 'nome', 'preco_unitario', 'tipo']);
  });

  it.each([0, 0.1, 19.99, 99999999.99])('aceita preço %p', (preco) => {
    expect(createPecaDto.safeParse(buildPecaPayload({ preco_unitario: preco })).success).toBe(true);
  });

  it.each([
    ['preco_unitario', { preco_unitario: -1 }],
    ['preco_unitario', { preco_unitario: 1.999 }],
    ['preco_unitario', { preco_unitario: 100000000 }],
    ['preco_unitario', { preco_unitario: '10' }],
    ['tipo', { tipo: 'SERVICO' }],
    ['estoque_minimo', { estoque_minimo: -1 }],
    ['estoque_minimo', { estoque_minimo: 1.5 }],
  ])('rejeita %s inválido (%o)', (campo, override) => {
    expect(fieldsWithError(createPecaDto.safeParse(buildPecaPayload(override)))).toEqual([campo]);
  });
});

describe('entradaDto', () => {
  it.each([1, 1_000_000])('aceita %p', (quantidade) => {
    expect(entradaDto.safeParse({ quantidade }).success).toBe(true);
  });

  it.each([0, -1, 1.5, '3', 1_000_001])('rejeita %p', (quantidade) => {
    expect(entradaDto.safeParse({ quantidade }).success).toBe(false);
  });
});

describe('listQueryDto', () => {
  it('converte abaixo_minimo e normaliza o código', () => {
    expect(listQueryDto.parse({ abaixo_minimo: 'true', codigo: 'flt-01', tipo: 'INSUMO' })).toEqual({
      page: 1,
      limit: 20,
      abaixo_minimo: true,
      codigo: 'FLT-01',
      tipo: 'INSUMO',
    });
    expect(listQueryDto.parse({ abaixo_minimo: 'false' }).abaixo_minimo).toBe(false);
    expect(listQueryDto.safeParse({ abaixo_minimo: 'talvez' }).success).toBe(false);
  });
});
