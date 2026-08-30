import 'dotenv/config';
import db from '../models/index.js';

const { sequelize } = db;

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Starting roll_number migration...');

        // 1. Add roll_number column to classroom_students if it doesn't exist
        console.log('Adding roll_number to classroom_students...');
        await sequelize.query(`
            ALTER TABLE "classroom_students" 
            ADD COLUMN IF NOT EXISTS "roll_number" VARCHAR(20);
        `);

        // 2. Migrate data from students to classroom_students
        console.log('Migrating data from students to classroom_students...');
        await sequelize.query(`
            UPDATE "classroom_students" cs
            SET "roll_number" = s."roll_number"
            FROM "students" s
            WHERE cs."student_id" = s."id"
              AND s."roll_number" IS NOT NULL;
        `);

        // 3. Drop roll_number from students
        console.log('Dropping roll_number from students...');
        await sequelize.query(`
            ALTER TABLE "students"
            DROP COLUMN IF EXISTS "roll_number";
        `);

        // 4. Add unique index to classroom_students
        console.log('Adding unique constraint on (classroom_id, roll_number)...');
        // We drop it first just in case it exists to avoid errors
        await sequelize.query(`
            DROP INDEX IF EXISTS "unique_classroom_roll";
        `);
        // We need a partial index or we only enforce uniqueness when roll_number is not null, 
        // Postgres treats NULLs as distinct by default so a standard unique index is fine.
        await sequelize.query(`
            CREATE UNIQUE INDEX "unique_classroom_roll" 
            ON "classroom_students" ("classroom_id", "roll_number");
        `);

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
