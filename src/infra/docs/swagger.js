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
  },
  apis: [path.join(__dirname, '../../features/**/*.routes.js')],
});

module.exports = { swaggerSpec };
