const { ValidationError } = require('../../shared/errors');

const toDetails = (issues) =>
  issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message }));

/**
 * Valida params, query e body com schemas Zod.
 * No Express 5 `req.query` é somente leitura, então a query parseada vai para `req.validatedQuery`.
 */
function validate({ params, query, body } = {}) {
  return (req, res, next) => {
    const details = [];
    const parsed = {};

    for (const [key, schema] of Object.entries({ params, query, body })) {
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (result.success) parsed[key] = result.data;
      else details.push(...toDetails(result.error.issues));
    }

    if (details.length > 0) return next(new ValidationError('Dados inválidos', details));

    if (parsed.params) req.params = parsed.params;
    if (parsed.query) req.validatedQuery = parsed.query;
    if (parsed.body) req.body = parsed.body;
    return next();
  };
}

module.exports = { validate };
