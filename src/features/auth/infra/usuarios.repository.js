const { Usuario } = require('./usuarios.model');

async function findByUsuario(usuario) {
  const found = await Usuario.findOne({ where: { usuario } });
  return found ? found.toJSON() : null;
}

module.exports = { findByUsuario };
