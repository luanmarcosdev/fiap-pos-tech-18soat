const bcrypt = require('bcryptjs');

function compare(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { compare };
