const request = require('supertest');
const app = require('@src/app');

describe('Health', () => {
  it('GET /api/health retorna status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/docs/ serve o Swagger UI', async () => {
    const response = await request(app).get('/api/docs/');

    expect(response.status).toBe(200);
  });

  it('responde 400 para JSON malformado', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"invalido"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'JSON inválido' });
  });
});
