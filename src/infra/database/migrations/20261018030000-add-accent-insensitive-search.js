'use strict';

/**
 * Busca de texto sem diferenciar acentos ("oleo" encontra "óleo"):
 * - unaccent: remove acentos; f_unaccent é um wrapper IMMUTABLE porque unaccent() não é, e índices exigem isso
 * - pg_trgm: índice GIN de trigramas, que torna o ILIKE '%termo%' indexável
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS unaccent;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

      DROP INDEX servicos_nome_unique;
      CREATE UNIQUE INDEX servicos_nome_unique ON servicos (lower(f_unaccent(nome))) WHERE deleted_at IS NULL;

      CREATE INDEX servicos_nome_trgm_idx ON servicos USING gin (f_unaccent(nome) gin_trgm_ops);
      CREATE INDEX clientes_nome_trgm_idx ON clientes USING gin (f_unaccent(nome) gin_trgm_ops);
    `);
  },

  // as extensões ficam: removê-las poderia quebrar outros objetos do banco que dependam delas
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS clientes_nome_trgm_idx;
      DROP INDEX IF EXISTS servicos_nome_trgm_idx;

      DROP INDEX servicos_nome_unique;
      CREATE UNIQUE INDEX servicos_nome_unique ON servicos (lower(nome)) WHERE deleted_at IS NULL;

      DROP FUNCTION IF EXISTS f_unaccent(text);
    `);
  },
};
