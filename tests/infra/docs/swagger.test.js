describe('swaggerSpec', () => {
  const load = () => {
    let spec;
    jest.isolateModules(() => {
      ({ swaggerSpec: spec } = require('@src/infra/docs/swagger'));
    });
    return spec;
  };

  it('todos os blocos @openapi são YAML válido', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});

    load();

    // o swagger-jsdoc não lança: só loga e descarta o bloco inválido
    expect(error).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    error.mockRestore();
    info.mockRestore();
  });

  it('não tem chaves nulas (sintoma de vírgula sem aspas em mapeamento inline)', () => {
    const nullKeys = [];
    (function walk(node, path) {
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          if (value === null) nullKeys.push(`${path}.${key}`);
          walk(value, `${path}.${key}`);
        }
      }
    })(load(), '');

    expect(nullKeys).toEqual([]);
  });
});
