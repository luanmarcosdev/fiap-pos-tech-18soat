const {
  listQueryDto,
  consultaDto,
  criarDto,
  adicionarServicoDto,
  adicionarPecaDto,
  concluirDiagnosticoDto,
} = require('@src/features/ordem-servico/http/ordem-servico.dto');

describe('listQueryDto', () => {
  it('aplica a paginação padrão e aceita os filtros', () => {
    expect(listQueryDto.parse({ status: 'EM_DIAGNOSTICO' })).toEqual({ page: 1, limit: 20, status: 'EM_DIAGNOSTICO' });
  });

  it.each([
    ['status desconhecido', { status: 'CANCELADA' }],
    ['cliente_id inválido', { cliente_id: 'abc' }],
    ['veiculo_id inválido', { veiculo_id: 'abc' }],
    ['limit acima de 100', { limit: '101' }],
  ])('rejeita %s', (_, query) => {
    expect(listQueryDto.safeParse(query).success).toBe(false);
  });
});

describe('criarDto', () => {
  const body = {
    cliente_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    veiculo_id: '7e8f9a0b-1c2d-4e3f-8a5b-6c7d8e9f0a1b',
    queixa: '  Barulho ao frear ',
  };

  it('remove espaços da queixa', () => {
    expect(criarDto.parse(body)).toEqual({ ...body, queixa: 'Barulho ao frear' });
  });

  it.each([
    ['cliente_id inválido', { ...body, cliente_id: 'abc' }],
    ['veiculo_id ausente', { ...body, veiculo_id: undefined }],
    ['queixa vazia', { ...body, queixa: '   ' }],
    ['queixa longa', { ...body, queixa: 'x'.repeat(5001) }],
  ])('rejeita %s', (_, input) => {
    expect(criarDto.safeParse(input).success).toBe(false);
  });
});

describe('concluirDiagnosticoDto', () => {
  it('remove espaços do diagnóstico', () => {
    expect(concluirDiagnosticoDto.parse({ diagnostico: '  Pastilhas gastas ' })).toEqual({
      diagnostico: 'Pastilhas gastas',
    });
  });

  it.each([
    ['ausente', {}],
    ['vazio', { diagnostico: '   ' }],
    ['longo', { diagnostico: 'x'.repeat(5001) }],
    ['não texto', { diagnostico: 42 }],
  ])('rejeita diagnóstico %s', (_, body) => {
    expect(concluirDiagnosticoDto.safeParse(body).success).toBe(false);
  });
});

describe('adicionarPecaDto', () => {
  const PECA_ID = '9f8e7d6c-5b4a-4321-8fed-cba987654321';

  it('aceita peça e quantidade inteira positiva', () => {
    expect(adicionarPecaDto.parse({ peca_id: PECA_ID, quantidade: 2 })).toEqual({ peca_id: PECA_ID, quantidade: 2 });
  });

  it.each([
    ['peça inválida', { peca_id: 'abc', quantidade: 1 }],
    ['quantidade ausente', { peca_id: PECA_ID }],
    ['quantidade zero', { peca_id: PECA_ID, quantidade: 0 }],
    ['quantidade decimal', { peca_id: PECA_ID, quantidade: 1.5 }],
    ['quantidade em string', { peca_id: PECA_ID, quantidade: '2' }],
    ['quantidade acima do limite', { peca_id: PECA_ID, quantidade: 10_001 }],
  ])('rejeita %s', (_, body) => {
    expect(adicionarPecaDto.safeParse(body).success).toBe(false);
  });
});

describe('adicionarServicoDto', () => {
  it('exige servico_id em UUID', () => {
    expect(adicionarServicoDto.safeParse({ servico_id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d' }).success).toBe(true);
    expect(adicionarServicoDto.safeParse({ servico_id: 'abc' }).success).toBe(false);
    expect(adicionarServicoDto.safeParse({}).success).toBe(false);
  });
});

describe('consultaDto', () => {
  it('aceita documento com máscara e remove espaços', () => {
    expect(consultaDto.parse({ numero: 42, documento: ' 529.982.247-25 ' })).toEqual({
      numero: 42,
      documento: '529.982.247-25',
    });
  });

  it.each([
    ['número ausente', { documento: '52998224725' }],
    ['número zero', { numero: 0, documento: '52998224725' }],
    ['número decimal', { numero: 1.5, documento: '52998224725' }],
    ['número em string', { numero: '42', documento: '52998224725' }],
    ['número acima do limite do banco', { numero: 2147483648, documento: '52998224725' }],
    ['documento ausente', { numero: 42 }],
    ['documento curto', { numero: 42, documento: '123' }],
    ['documento longo', { numero: 42, documento: '1'.repeat(19) }],
  ])('rejeita %s', (_, body) => {
    expect(consultaDto.safeParse(body).success).toBe(false);
  });
});
