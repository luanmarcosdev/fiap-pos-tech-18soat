const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./infra/docs/swagger');
const { errorHandler } = require('./infra/http/error-handler');
const health = require('./features/health');

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


// API called with /api prefix
app.use('/api', api);

// precisa ser registrado depois das rotas
app.use(errorHandler);

module.exports = app;
