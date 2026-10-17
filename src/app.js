const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./infra/docs/swagger');
const { errorHandler } = require('./infra/http/error-handler');
const health = require('./features/health');
const auth = require('./features/auth');
const clientes = require('./features/clientes');
const veiculos = require('./features/veiculos');

// create express app
const app = express();
app.use(express.json());

/**
 * API routes
 * Add your routes here 
 */
const api = express.Router();
api.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
api.use(health.routes);

// rotas públicas
api.use(auth.routes);

// rotas protegidas
api.use('/clientes', auth.authenticate, clientes.routes);
api.use('/veiculos', auth.authenticate, veiculos.routes);

// API called with /api prefix
app.use('/api', api);

// precisa ser registrado depois das rotas
app.use(errorHandler);

module.exports = app;
