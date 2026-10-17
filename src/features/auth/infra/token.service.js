const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../../../shared/errors');

function sign({ sub, usuario }) {
  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, {
    subject: sub,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000) };
}

function verify(token) {
  try {
    const { sub, usuario } = jwt.verify(token, process.env.JWT_SECRET);
    return { sub, usuario };
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

module.exports = { sign, verify };
