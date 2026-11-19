'use strict';

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const { sequelize } = db;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * MigrationManager
 * Provides version-controlled, tracked, and deterministic migration execution.
 * Tracks executed migrations in the `SequelizeMeta` table in PostgreSQL.
 */
class MigrationManager {
    async init() {
        await sequelize.authenticate();
        // Create tracking table if it doesn't exist
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
                "name" VARCHAR(255) NOT NULL PRIMARY KEY,
                "executed_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
        }
    }

    async getExecutedMigrations() {
        const [results] = await sequelize.query(`SELECT "name" FROM "SequelizeMeta" ORDER BY "name" ASC;`);
        return new Set(results.map(r => r.name));
    }

    async recordMigration(name) {
        await sequelize.query(`INSERT INTO "SequelizeMeta" ("name") VALUES (:name);`, {
            replacements: { name },
        });
    }

    async status() {
        await this.init();
        const executed = await this.getExecutedMigrations();
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js')).sort();

        logger.info('====================================================');
        logger.info('DATABASE MIGRATION STATUS');
        logger.info('====================================================');
        if (files.length === 0) {
            logger.info('No migration files found in migrations directory.');
        } else {
            files.forEach(f => {
                const status = executed.has(f) ? '[EXECUTED]' : '[PENDING] ';
                logger.info(`${status}  ${f}`);
            });
        }
        logger.info('====================================================');
    }

    async migrate() {
        await this.init();
        const executed = await this.getExecutedMigrations();
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js')).sort();

        let appliedCount = 0;
        for (const file of files) {
            if (executed.has(file)) continue;

            logger.info(`Running migration: ${file}...`);
            const migrationPath = path.join(MIGRATIONS_DIR, file);
            const migration = await import(`file://${migrationPath}`);

            const transaction = await sequelize.transaction();
            try {
                if (typeof migration.up === 'function') {
                    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize, transaction);
                }
                await sequelize.query(`INSERT INTO "SequelizeMeta" ("name") VALUES (:name);`, {
                    replacements: { name: file },
                    transaction,
                });
                await transaction.commit();
                logger.info(`✓ Successfully applied: ${file}`);
                appliedCount++;
            } catch (err) {
                await transaction.rollback();
                logger.error(`✗ Migration failed on ${file}:`, err?.message || err);
                if (err?.original) logger.error('Original DB error message:', err.original.message);
                throw err;
            }
        }

        if (appliedCount === 0) {
            logger.info('Database schema is already up to date. No pending migrations.');
        } else {
            logger.info(`✓ Applied ${appliedCount} pending migration(s) successfully.`);
        }
    }
}

// CLI Runner
const manager = new MigrationManager();
const command = process.argv[2] || 'up';

(async () => {
    try {
        if (command === 'status') {
            await manager.status();
        } else {
            await manager.migrate();
        }
        process.exit(0);
    } catch (err) {
        logger.error('MigrationManager error:', err);
        process.exit(1);
    }
})();

export default MigrationManager;
