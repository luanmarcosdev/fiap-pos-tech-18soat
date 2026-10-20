const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./infra/docs/swagger');
const { errorHandler } = require('./infra/http/error-handler');
const health = require('./features/health');
const auth = require('./features/auth');
const clientes = require('./features/clientes');
const veiculos = require('./features/veiculos');
const servicos = require('./features/servicos');
const pecas = require('./features/pecas');
const ordemServico = require('./features/ordem-servico');

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
api.use('/servicos', auth.authenticate, servicos.routes);
api.use('/pecas', auth.authenticate, pecas.routes);
api.use('/ordens-servico', auth.authenticate, ordemServico.routes);

// API called with /api prefix
app.use('/api', api);

// precisa ser registrado depois das rotas
app.use(errorHandler);

module.exports = app;
