require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'ahm_mart_db'
    },
    migrations: {
      extension: 'js',
      directory: './db/migrations'
    },
    seeds: {
      extension: 'js',
      directory: './db/seeds'
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    migrations: {
      extension: 'js',
      directory: './db/migrations'
    },
    seeds: {
      extension: 'js',
      directory: './db/seeds'
    }
  }
};
