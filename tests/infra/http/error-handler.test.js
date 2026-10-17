const { UniqueConstraintError } = require('sequelize');
const { errorHandler } = require('@src/infra/http/error-handler');
const { NotFoundError, ValidationError } = require('@src/shared/errors');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('errorHandler', () => {
  it('traduz AppError para status e { erro }', () => {
    const res = mockRes();

    errorHandler(new NotFoundError('Cliente não encontrado'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Cliente não encontrado' });
  });

  it('inclui detalhes quando existirem', () => {
    const res = mockRes();
    const details = [{ campo: 'nome', mensagem: 'obrigatório' }];

    errorHandler(new ValidationError('Dados inválidos', details), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Dados inválidos', detalhes: details });
  });

  it('traduz UniqueConstraintError para 409', () => {
    const res = mockRes();

    errorHandler(new UniqueConstraintError({}), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('traduz JSON malformado para 400', () => {
    const res = mockRes();
    const err = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' });

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ erro: 'JSON inválido' });
  });

  it('responde 500 e loga erros desconhecidos', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('boom'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno do servidor' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
