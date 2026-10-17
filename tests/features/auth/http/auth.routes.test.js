jest.mock('@src/features/auth/infra/usuarios.repository');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('@src/app');
const usuariosRepository = require('@src/features/auth/infra/usuarios.repository');
const tokenService = require('@src/features/auth/infra/token.service');

const admin = {
  id: 'b6f1c0de-0000-4000-8000-000000000001',
  usuario: 'admin',
  senha_hash: bcrypt.hashSync('admin', 4),
};

describe('POST /api/auth/login', () => {
  it('200 com token válido para as credenciais corretas', async () => {
    usuariosRepository.findByUsuario.mockResolvedValue(admin);

    const response = await request(app).post('/api/auth/login').send({ usuario: 'admin', senha: 'admin' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ token: expect.any(String), tipo: 'Bearer', expiraEm: expect.any(String) });
    expect(tokenService.verify(response.body.token)).toEqual({ sub: admin.id, usuario: 'admin' });
    expect(usuariosRepository.findByUsuario).toHaveBeenCalledWith('admin');
  });

  it('401 com senha errada', async () => {
    usuariosRepository.findByUsuario.mockResolvedValue(admin);

    const response = await request(app).post('/api/auth/login').send({ usuario: 'admin', senha: 'errada' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ erro: 'Credenciais inválidas' });
  });

  it('401 com usuário inexistente', async () => {
    usuariosRepository.findByUsuario.mockResolvedValue(null);

    const response = await request(app).post('/api/auth/login').send({ usuario: 'x', senha: 'y' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ erro: 'Credenciais inválidas' });
  });

  it('400 com payload inválido', async () => {
    const response = await request(app).post('/api/auth/login').send({ usuario: '' });

    expect(response.status).toBe(400);
    expect(response.body.detalhes.map((d) => d.campo).sort()).toEqual(['senha', 'usuario']);
    expect(usuariosRepository.findByUsuario).not.toHaveBeenCalled();
  });
});
