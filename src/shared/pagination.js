function buildPage(rows, count, page, limit) {
  return {
    data: rows,
    meta: { page, limit, total: count },
  };
}

module.exports = { buildPage };
