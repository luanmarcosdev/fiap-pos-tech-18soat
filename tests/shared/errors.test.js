const {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} = require('@src/shared/errors');

describe('errors', () => {
  it.each([
    [ValidationError, 400],
    [UnauthorizedError, 401],
    [NotFoundError, 404],
    [ConflictError, 409],
    [UnprocessableError, 422],
  ])('%p usa o status %i e herda de AppError', (ErrorClass, status) => {
    const error = new ErrorClass('mensagem');

    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
    expect(error.message).toBe('mensagem');
    expect(error.name).toBe(ErrorClass.name);
  });

  it('ValidationError carrega os detalhes', () => {
    const details = [{ campo: 'nome', mensagem: 'obrigatório' }];

    expect(new ValidationError(undefined, details)).toMatchObject({
      message: 'Dados inválidos',
      details,
    });
  });

  it('usa mensagens padrão quando nenhuma é informada', () => {
    expect(new UnauthorizedError().message).toBe('Não autorizado');
    expect(new NotFoundError().message).toBe('Recurso não encontrado');
    expect(new ConflictError().message).toBe('Conflito com o estado atual do recurso');
    expect(new UnprocessableError().message).toBe('Não foi possível processar a requisição');
  });
});
