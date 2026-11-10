import 'dotenv/config';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

async function runPhase2Migrations() {
    try {
        await sequelize.authenticate();
        logger.info('Connected to PostgreSQL for Phase 2 migrations.');

        // 1. Create student_concessions table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS student_concessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
                fee_head_id UUID REFERENCES fee_heads(id) ON DELETE SET NULL,
                discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
                discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                reason VARCHAR(255) NOT NULL,
                requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
                approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
        `);
        logger.info('✓ student_concessions table ready.');

        // 2. Create fee_payment_reversals table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS fee_payment_reversals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL UNIQUE REFERENCES fee_payments(id) ON DELETE CASCADE,
                reversal_receipt_number VARCHAR(50) NOT NULL UNIQUE,
                reversed_amount NUMERIC(10, 2) NOT NULL,
                bounce_penalty_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                reason VARCHAR(255) NOT NULL,
                authorized_by_id UUID NOT NULL REFERENCES users(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
        `);
        logger.info('✓ fee_payment_reversals table ready.');

        // 3. Sequences and column additions
        await sequelize.query(`
            CREATE SEQUENCE IF NOT EXISTS fee_reversal_seq START 1;
            ALTER TABLE student_invoices ADD COLUMN IF NOT EXISTS concession_amount NUMERIC(10, 2) DEFAULT 0.00;
            ALTER TABLE student_invoices ADD COLUMN IF NOT EXISTS waived_fine_amount NUMERIC(10, 2) DEFAULT 0.00;
            ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'CLEARED';
        `);
        logger.info('✓ Sequences & column additions ready.');

        process.exit(0);
    } catch (err) {
        logger.error('Phase 2 migration failed:', err);
        process.exit(1);
    }
}

runPhase2Migrations();

