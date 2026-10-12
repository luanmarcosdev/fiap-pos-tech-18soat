require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./infra/database/sequelize');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o Postgres estabelecida');
  } catch (error) {
    console.error('Falha ao conectar no Postgres:', error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
    console.log(`Swagger disponível em http://localhost:${PORT}/api/docs`);
  });
}

start();
