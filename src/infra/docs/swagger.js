const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    servers: [{ url: '/api' }],
    info: {
      title: 'FIAP Pós Tech 18SOAT - Mecânica API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Erro: {
          type: 'object',
          properties: {
            erro: { type: 'string', example: 'Recurso não encontrado' },
          },
        },
        ErroValidacao: {
          type: 'object',
          properties: {
            erro: { type: 'string', example: 'Dados inválidos' },
            detalhes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  campo: { type: 'string', example: 'nome' },
                  mensagem: { type: 'string', example: 'Campo obrigatório' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../../features/**/*.routes.js')],
});

module.exports = { swaggerSpec };
