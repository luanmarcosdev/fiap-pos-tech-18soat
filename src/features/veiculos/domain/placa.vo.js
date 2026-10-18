const { ValidationError } = require('../../../shared/errors');

// antiga: ABC1234 | Mercosul: ABC1D23 (a 5ª posição é letra no padrão Mercosul)
const PLACA_REGEX = /^[A-Z]{3}\d[A-Z\d]\d{2}$/;

/** Placa de veículo, no formato antigo ou Mercosul. Imutável e sempre válida. */
class Placa {
  #valor;

  constructor(valor) {
    const normalized = Placa.normalize(valor);
    if (!Placa.isValid(normalized)) {
      throw new ValidationError('Placa inválida', [{ campo: 'placa', mensagem: 'Placa inválida' }]);
    }
    this.#valor = normalized;
    Object.freeze(this);
  }

  static create(valor) {
    return new Placa(valor);
  }

  /** Remove hífen e espaços e coloca em maiúsculas. */
  static normalize(valor) {
    return String(valor ?? '').replace(/[^\dA-Za-z]/g, '').toUpperCase();
  }

  static isValid(valor) {
    return PLACA_REGEX.test(Placa.normalize(valor));
  }

  get valor() {
    return this.#valor;
  }

  get ehMercosul() {
    return /[A-Z]/.test(this.#valor[4]);
  }

  equals(other) {
    return other instanceof Placa && other.valor === this.#valor;
  }

  toString() {
    return this.#valor;
  }
}

module.exports = { Placa };
