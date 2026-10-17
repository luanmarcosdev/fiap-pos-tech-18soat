const { createClienteDto, listQueryDto, idParamDto } = require('@src/features/clientes/http/clientes.dto');
const { CPF, buildClientePayload } = require('../clientes.fixtures');

const fieldsWithError = (result) => result.error.issues.map((issue) => issue.path.join('.')).sort();

describe('createClienteDto', () => {
  it('normaliza documento, telefone, cep e estado', () => {
    const result = createClienteDto.parse(buildClientePayload({ estado: 'sp', nome: '  Maria  ' }));

    expect(result).toMatchObject({
      nome: 'Maria',
      documento: CPF,
      telefone: '11987654321',
      cep: '01310100',
      estado: 'SP',
    });
  });

  it('não aceita tipo_pessoa nem campos desconhecidos no payload', () => {
    const result = createClienteDto.parse(buildClientePayload({ tipo_pessoa: 'PJ', id: 'x' }));

    expect(result).not.toHaveProperty('tipo_pessoa');
    expect(result).not.toHaveProperty('id');
  });

  it('transforma email e complemento ausentes ou vazios em null', () => {
    const payload = buildClientePayload({ complemento: '   ' });
    delete payload.email;

    const result = createClienteDto.parse(payload);

    expect(result.email).toBeNull();
    expect(result.complemento).toBeNull();
  });

  it('exige os campos obrigatórios', () => {
    const result = createClienteDto.safeParse({});

    expect(fieldsWithError(result)).toEqual(
      ['bairro', 'cep', 'cidade', 'documento', 'estado', 'nome', 'numero', 'rua', 'telefone'],
    );
  });

  it.each([
    ['documento', { documento: '529.982.247-24' }],
    ['email', { email: 'nao-e-email' }],
    ['telefone', { telefone: '1234' }],
    ['cep', { cep: '0131010' }],
    ['estado', { estado: 'XX' }],
  ])('rejeita %s inválido', (campo, override) => {
    const result = createClienteDto.safeParse(buildClientePayload(override));

    expect(fieldsWithError(result)).toEqual([campo]);
  });
});

describe('listQueryDto', () => {
  it('aplica a paginação padrão e normaliza o documento', () => {
    expect(listQueryDto.parse({ documento: '529.982.247-25' })).toEqual({ page: 1, limit: 20, documento: CPF });
  });
});

describe('idParamDto', () => {
  it('rejeita id que não é UUID', () => {
    expect(idParamDto.safeParse({ id: '123' }).success).toBe(false);
  });
});
