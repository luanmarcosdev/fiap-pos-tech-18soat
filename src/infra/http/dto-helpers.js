const { z } = require('zod');

// campos opcionais viram null quando ausentes ou vazios, já que o PUT substitui o recurso inteiro
const optionalText = (max) => z.string().trim().max(max).nullish().transform((v) => v || null);

module.exports = { optionalText };
