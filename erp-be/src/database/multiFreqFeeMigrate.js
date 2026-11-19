import 'dotenv/config';
import db from '../models/index.js';

async function updateFeeStructureSchema() {
    try {
        console.log('Connecting to database...');
        await db.sequelize.authenticate();

        // 1. Add frequency and is_enabled to fee_structure_items
        await db.sequelize.query(`
            ALTER TABLE fee_structure_items 
            ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'MONTHLY';
        `);
        await db.sequelize.query(`
            ALTER TABLE fee_structure_items 
            ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
        `);

        // 2. Add active_frequencies to fee_structures
        await db.sequelize.query(`
            ALTER TABLE fee_structures 
            ADD COLUMN IF NOT EXISTS active_frequencies TEXT[] DEFAULT ARRAY['MONTHLY', 'QUARTERLY', 'ANNUAL'];
        `);

        // 3. Drop old unique constraint on fee_structure_items if it only constrained (structure_id, head_id)
        await db.sequelize.query(`
            ALTER TABLE fee_structure_items DROP CONSTRAINT IF EXISTS unique_structure_head;
        `);

        // 4. Create fee_structure_discounts table
        await db.sequelize.query(`
            CREATE TABLE IF NOT EXISTS fee_structure_discounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
                quota VARCHAR(30) NOT NULL,
                discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
                discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                scope VARCHAR(20) NOT NULL DEFAULT 'ALL_HEADS',
                applicable_fee_head_ids UUID[],
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
        `);

        console.log('✓ Fee Structure Multi-Frequency & Quota Discount schema ready in Neon DB.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

updateFeeStructureSchema();

