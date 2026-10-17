const { z } = require('zod');
const { validate } = require('@src/infra/http/validate');
const { paginationQueryDto } = require('@src/infra/http/pagination');
const { ValidationError } = require('@src/shared/errors');

const run = (schemas, req) => {
  const next = jest.fn();
  validate(schemas)(req, {}, next);
  return next;
};

describe('validate', () => {
  const body = z.object({ nome: z.string().trim().min(1) });
  const params = z.object({ id: z.uuid() });

  it('substitui body e params pelos dados parseados', () => {
    const id = '3f1c2a8e-9b7d-4c6e-8a5f-1b2c3d4e5f60';
    const req = { body: { nome: '  Ana  ', extra: 1 }, params: { id } };

    const next = run({ body, params }, req);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ nome: 'Ana' });
    expect(req.params).toEqual({ id });
  });

  it('coloca a query parseada em req.validatedQuery', () => {
    const req = { query: { page: '2' } };

    run({ query: paginationQueryDto }, req);

    expect(req.validatedQuery).toEqual({ page: 2, limit: 20 });
    expect(req.query).toEqual({ page: '2' });
  });

  it('gera ValidationError com detalhes por campo', () => {
    const req = { body: { nome: '' }, params: { id: 'x' } };

    const next = run({ body, params }, req);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual([
      { campo: 'id', mensagem: expect.any(String) },
      { campo: 'nome', mensagem: expect.any(String) },
    ]);
  });

  it('rejeita limit acima de 100', () => {
    const next = run({ query: paginationQueryDto }, { query: { limit: '101' } });

    expect(next.mock.calls[0][0].details).toEqual([{ campo: 'limit', mensagem: expect.any(String) }]);
  });
});
