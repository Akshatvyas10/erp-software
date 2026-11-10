import { Sequelize } from 'sequelize';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[SQL] ${msg}`) : false,

    // SSL configuration for Neon (and other PostgreSQL cloud providers)
    // - In development: rejectUnauthorized: false (self-signed/SNI OK)
    // - In production: rejectUnauthorized: true by default (CA-validated)
    //   Override with DB_SSL_REJECT_UNAUTHORIZED=false ONLY if your provider
    //   explicitly requires it and you understand the security implications.
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: process.env.NODE_ENV === 'production'
                ? (process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false')
                : false,
        },
        // Neon serverless pooler needs channel_binding disabled at the driver level
        // (it is handled in the connection string already)
        connectTimeout: 10000,
    },

    pool: {
        max: 50,  // Upgraded from 5 to handle concurrent bursts (e.g. attendance rush)
        min: 2,
        acquire: 60000,
        idle: 10000,
        evict: 1000,
    },

    define: {
        underscored: true,   // all column names snake_case
        timestamps: true,    // createdAt / updatedAt
        paranoid: true,      // deletedAt for soft deletes
    },
});

export default sequelize;
