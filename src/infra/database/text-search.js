const { Op, fn, col, where } = require('sequelize');
const { escapeLike } = require('./escape-like');

// f_unaccent é criada pela migration add-accent-insensitive-search; usar a mesma expressão do índice permite que ele seja usado
const unaccent = (value) => fn('f_unaccent', value);

/** `column` contém `term`, sem diferenciar maiúsculas nem acentos ("oleo" encontra "Troca de Óleo"). */
function containsIgnoringAccents(column, term) {
  return where(unaccent(col(column)), { [Op.iLike]: unaccent(`%${escapeLike(term)}%`) });
}

/** `column` é igual a `value`, sem diferenciar maiúsculas nem acentos. */
function equalsIgnoringAccents(column, value) {
  return where(fn('lower', unaccent(col(column))), fn('lower', unaccent(value)));
}

module.exports = { containsIgnoringAccents, equalsIgnoringAccents };
