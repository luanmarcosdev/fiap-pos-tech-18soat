function paginate(rows, count, page, limit) {
  return {
    data: rows,
    meta: { page, limit, total: count },
  };
}

module.exports = { paginate };
