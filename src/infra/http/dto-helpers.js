const { z } = require('zod');

const PRECO_MAXIMO = 99999999.99; // DECIMAL(10,2)

// compara em centavos para não sofrer com ponto flutuante (ex.: 0.1 + 0.2)
const hasAtMostTwoDecimals = (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

// campos opcionais viram null quando ausentes ou vazios, já que o PUT substitui o recurso inteiro
const optionalText = (max) => z.string().trim().max(max).nullish().transform((v) => v || null);

// valor monetário gravado em DECIMAL(10,2)
const preco = () =>
  z.number().min(0).max(PRECO_MAXIMO).refine(hasAtMostTwoDecimals, 'Use no máximo 2 casas decimais');

module.exports = { optionalText, preco };
