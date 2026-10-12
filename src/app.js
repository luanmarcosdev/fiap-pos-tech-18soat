const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./infra/docs/swagger');
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

module.exports = app;
