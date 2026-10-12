require('dotenv').config();

const config = {
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
