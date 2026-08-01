'use strict';

const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[SQL] ${msg}`) : false,

    // Neon requires SSL on every connection
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // Neon uses SNI; set to true + provide CA in prod if needed
        },
        // Neon serverless pooler needs channel_binding disabled at the driver level
        // (it is handled in the connection string already)
        connectTimeout: 10000,
    },

    pool: {
        max: 5,   // Neon free tier allows limited concurrent connections
        min: 0,
        acquire: 30000,
        idle: 20000,
        evict: 1000,
    },

    define: {
        underscored: true,   // all column names snake_case
        timestamps: true,    // createdAt / updatedAt
        paranoid: true,      // deletedAt for soft deletes
    },
});

module.exports = sequelize;
