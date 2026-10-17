const { ValidationError } = require('../../../shared/errors');

const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const allSameChar = (value) => /^(.)\1+$/.test(value);

// No CNPJ alfanumérico cada caractere vale (código ASCII - 48), o que mantém o cálculo antigo para dígitos
const charValue = (char) => char.charCodeAt(0) - 48;

function cpfCheckDigit(digits) {
  const sum = digits.reduce((acc, digit, i) => acc + digit * (digits.length + 1 - i), 0);
  return ((sum * 10) % 11) % 10;
}

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || allSameChar(cpf)) return false;
  const digits = [...cpf].map(Number);
  const dv1 = cpfCheckDigit(digits.slice(0, 9));
  const dv2 = cpfCheckDigit([...digits.slice(0, 9), dv1]);
  return dv1 === digits[9] && dv2 === digits[10];
}

function cnpjCheckDigit(values) {
  const weights = CNPJ_WEIGHTS.slice(CNPJ_WEIGHTS.length - values.length);
  const rest = values.reduce((acc, value, i) => acc + value * weights[i], 0) % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function isValidCnpj(cnpj) {
  if (!/^[A-Z\d]{12}\d{2}$/.test(cnpj) || allSameChar(cnpj)) return false;
  const values = [...cnpj.slice(0, 12)].map(charValue);
  const dv1 = cnpjCheckDigit(values);
  const dv2 = cnpjCheckDigit([...values, dv1]);
  return `${dv1}${dv2}` === cnpj.slice(12);
}

/**
 * CPF ou CNPJ (inclusive o CNPJ alfanumérico). Imutável e sempre válido:
 * só é possível criar uma instância a partir de um documento com dígitos verificadores corretos.
 */
class Documento {
  #valor;

  constructor(valor) {
    const normalized = Documento.normalize(valor);
    if (!Documento.isValid(normalized)) {
      throw new ValidationError('Documento inválido', [{ campo: 'documento', mensagem: 'CPF ou CNPJ inválido' }]);
    }
    this.#valor = normalized;
    Object.freeze(this);
  }

  static create(valor) {
    return new Documento(valor);
  }

  /** Remove a máscara (pontos, barra, hífen, espaços) e coloca letras em maiúsculas. */
  static normalize(valor) {
    return String(valor ?? '').replace(/[^\dA-Za-z]/g, '').toUpperCase();
  }

  static isValid(valor) {
    const normalized = Documento.normalize(valor);
    return normalized.length === 11 ? isValidCpf(normalized) : isValidCnpj(normalized);
  }

  get valor() {
    return this.#valor;
  }

  get tipoPessoa() {
    return this.#valor.length === 11 ? 'PF' : 'PJ';
  }

  equals(other) {
    return other instanceof Documento && other.valor === this.#valor;
  }

  toString() {
    return this.#valor;
  }
}

module.exports = { Documento };
