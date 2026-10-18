// evita que % e _ digitados pelo usuário virem curingas no LIKE/ILIKE
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

module.exports = { escapeLike };
