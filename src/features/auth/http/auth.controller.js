class AuthController {
  #authService;

  constructor({ authService }) {
    this.#authService = authService;
  }

  login = async (req, res) => {
    const accessToken = await this.#authService.login(req.body);
    res.status(200).json(accessToken);
  };
}

module.exports = { AuthController };
