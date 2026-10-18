const { sequelize } = require('@src/infra/database/sequelize');
const { containsIgnoringAccents, equalsIgnoringAccents } = require('@src/infra/database/text-search');

// gera o SQL sem conectar no banco
const toSql = (condition) => sequelize.getQueryInterface().queryGenerator.whereQuery(condition);

describe('text-search', () => {
  it('containsIgnoringAccents usa f_unaccent nos dois lados e escapa os curingas', () => {
    expect(toSql(containsIgnoringAccents('nome', "50%_d'água"))).toBe(
      `WHERE f_unaccent("nome") ILIKE f_unaccent('%50\\%\\_d''água%')`,
    );
  });

  it('equalsIgnoringAccents compara lower(f_unaccent()) dos dois lados, como o índice único', () => {
    expect(toSql(equalsIgnoringAccents('nome', 'TROCA DE ÓLEO'))).toBe(
      `WHERE lower(f_unaccent("nome")) = lower(f_unaccent('TROCA DE ÓLEO'))`,
    );
  });
});
