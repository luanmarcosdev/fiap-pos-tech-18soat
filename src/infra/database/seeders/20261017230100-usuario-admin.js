'use strict';

const bcrypt = require('bcryptjs');

function adminCredentials() {
  const { ADMIN_USUARIO: usuario, ADMIN_SENHA: senha } = process.env;
  if (!usuario || !senha) {
    throw new Error('Defina ADMIN_USUARIO e ADMIN_SENHA no .env para rodar o seed do usuário admin');
  }
  return { usuario, senha };
}

module.exports = {
  async up(queryInterface) {
    const { usuario, senha } = adminCredentials();
    const senhaHash = bcrypt.hashSync(senha, 10);

    // idempotente: rodar o seed de novo não duplica nem altera o admin
    await queryInterface.sequelize.query(
      `INSERT INTO usuarios (usuario, senha_hash, perfil)
       VALUES (:usuario, :senhaHash, 'ADMIN')
       ON CONFLICT (usuario) DO NOTHING`,
      { replacements: { usuario, senhaHash } },
    );
  },

  async down(queryInterface) {
    const { usuario } = adminCredentials();
    await queryInterface.bulkDelete('usuarios', { usuario });
  },
};
