class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', details) {
    super(400, message, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(401, message);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(404, message);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito com o estado atual do recurso') {
    super(409, message);
  }
}

class UnprocessableError extends AppError {
  constructor(message = 'Não foi possível processar a requisição') {
    super(422, message);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
};
