jest.mock('@src/features/auth/infra/usuarios.model', () => ({
  Usuario: { findOne: jest.fn() },
}));

const { Usuario } = require('@src/features/auth/infra/usuarios.model');
const usuariosRepository = require('@src/features/auth/infra/usuarios.repository');

describe('usuariosRepository.findByUsuario', () => {
  it('devolve um objeto simples quando encontra', async () => {
    const data = { id: '1', usuario: 'admin' };
    Usuario.findOne.mockResolvedValue({ toJSON: () => data });

    await expect(usuariosRepository.findByUsuario('admin')).resolves.toEqual(data);
    expect(Usuario.findOne).toHaveBeenCalledWith({ where: { usuario: 'admin' } });
  });

  it('devolve null quando não encontra', async () => {
    Usuario.findOne.mockResolvedValue(null);

    await expect(usuariosRepository.findByUsuario('x')).resolves.toBeNull();
  });
});
