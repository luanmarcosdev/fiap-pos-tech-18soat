const { UniqueConstraintError } = require('sequelize');
const { AppError } = require('../../shared/errors');

// Express identifica o error handler pela aridade, por isso o `next` precisa existir
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { erro: err.message };
    if (err.details) body.detalhes = err.details;
    return res.status(err.status).json(body);
  }

  // rede de segurança: a regra de unicidade deveria ter sido checada no service
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ erro: 'Registro duplicado' });
  }

  // JSON malformado no body (body-parser)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}

module.exports = { errorHandler };
