const { Documento } = require('@src/features/clientes/domain/documento.vo');
const { ValidationError } = require('@src/shared/errors');
const { CPF, CNPJ, CNPJ_ALFANUMERICO } = require('../clientes.fixtures');

describe('Documento', () => {
  describe('isValid', () => {
    it.each([
      ['CPF sem máscara', CPF],
      ['CPF com máscara', '529.982.247-25'],
      ['CNPJ sem máscara', CNPJ],
      ['CNPJ com máscara', '11.222.333/0001-81'],
      ['CNPJ alfanumérico', CNPJ_ALFANUMERICO],
      ['CNPJ alfanumérico com máscara e minúsculas', '12.abc.345/01de-35'],
    ])('aceita %s', (_, valor) => {
      expect(Documento.isValid(valor)).toBe(true);
    });

    it.each([
      ['CPF com DV errado', '52998224724'],
      ['CNPJ com DV errado', '11222333000182'],
      ['CNPJ alfanumérico com DV errado', '12ABC34501DE36'],
      ['CNPJ com letra no DV', '12ABC34501DE3A'],
      ['CPF com letras', '5299822472A'],
      ['CPF com dígitos repetidos', '11111111111'],
      ['CNPJ com dígitos repetidos', '00000000000000'],
      ['tamanho inválido', '123456789'],
      ['vazio', ''],
      ['null', null],
    ])('rejeita %s', (_, valor) => {
      expect(Documento.isValid(valor)).toBe(false);
    });
  });

  describe('create', () => {
    it('normaliza o valor e deriva PF para CPF', () => {
      const documento = Documento.create('529.982.247-25');

      expect(documento.valor).toBe(CPF);
      expect(documento.tipoPessoa).toBe('PF');
      expect(String(documento)).toBe(CPF);
    });

    it('deriva PJ para CNPJ, inclusive alfanumérico', () => {
      expect(Documento.create(CNPJ).tipoPessoa).toBe('PJ');
      expect(Documento.create('12.abc.345/01de-35').valor).toBe(CNPJ_ALFANUMERICO);
    });

    it('gera ValidationError para documento inválido', () => {
      expect(() => Documento.create('123')).toThrow(ValidationError);
    });

    it('é imutável', () => {
      const documento = Documento.create(CPF);

      documento.valor = 'outro';
      documento.extra = 'x';

      expect(Object.isFrozen(documento)).toBe(true);
      expect(documento.valor).toBe(CPF);
      expect(documento).not.toHaveProperty('extra');
    });
  });

  describe('equals', () => {
    it('compara pelo valor normalizado', () => {
      expect(Documento.create(CPF).equals(Documento.create('529.982.247-25'))).toBe(true);
      expect(Documento.create(CPF).equals(Documento.create(CNPJ))).toBe(false);
      expect(Documento.create(CPF).equals(CPF)).toBe(false);
    });
  });
});
