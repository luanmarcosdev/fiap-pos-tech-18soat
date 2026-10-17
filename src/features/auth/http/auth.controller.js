function makeAuthController({ authService }) {
  return {
    async login(req, res) {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    },
  };
}

module.exports = { makeAuthController };
