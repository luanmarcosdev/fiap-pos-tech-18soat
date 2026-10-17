const { z } = require('zod');

const loginDto = z.object({
  usuario: z.string().trim().min(1).max(50),
  senha: z.string().min(1).max(100),
});

module.exports = { loginDto };
