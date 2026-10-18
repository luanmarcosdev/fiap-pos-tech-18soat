/**
 * Os handlers são arrow functions para manter o `this` quando o Express os recebe soltos:
 * `router.post('/auth/login', authController.login)`.
 */
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
