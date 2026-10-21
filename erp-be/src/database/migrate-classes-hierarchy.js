import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../models/index.js';
const { sequelize, AcademicClass, Classroom } = db;
import logger from '../utils/logger.js';

(async () => {
    try {
        await sequelize.authenticate();
        logger.info('Neon DB connection established for Class -> Section hierarchy migration.');

        // 1. Sync AcademicClass table
        await AcademicClass.sync({ force: false, alter: true });
        logger.info('✓ academic_classes table synced successfully.');

        // 2. Ensure class_id column & index exist on classrooms
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'classrooms' AND column_name = 'class_id'
                ) THEN
                    ALTER TABLE "classrooms" ADD COLUMN "class_id" UUID REFERENCES "academic_classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_classrooms_class_id" ON "classrooms" ("class_id");`);
        logger.info('✓ classrooms table verified with class_id column and index.');

        // 3. Backfill any existing classrooms that do not have a class_id
        const unlinkedClassrooms = await Classroom.findAll({
            where: { classId: null },
            attributes: ['id', 'name', 'section', 'academicYear', 'departmentId']
        });

        logger.info(`Found ${unlinkedClassrooms.length} unlinked classrooms needing backfill.`);

        if (unlinkedClassrooms.length > 0) {
            const distinctNames = [...new Set(unlinkedClassrooms.map(c => c.name.trim()))];

            for (let i = 0; i < distinctNames.length; i++) {
                const className = distinctNames[i];
                const sampleClassroom = unlinkedClassrooms.find(c => c.name.trim() === className);
                const code = className.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);

                let [academicClass] = await AcademicClass.findOrCreate({
                    where: { name: className },
                    defaults: {
                        name: className,
                        code: code || `CLS_${i + 1}`,
                        orderIndex: i + 1,
                        departmentId: sampleClassroom?.departmentId || null,
                        status: 'ACTIVE'
                    }
                });

                // Update unlinked classrooms with this name
                const [updatedCount] = await Classroom.update(
                    { classId: academicClass.id },
                    { where: { name: className, classId: null } }
                );

                logger.info(`✓ Linked ${updatedCount} sections of "${className}" to AcademicClass ID ${academicClass.id}`);
            }
        }

        logger.info('🎉 Class -> Section hierarchy migration finished successfully!');
        process.exit(0);
    } catch (err) {
        logger.error('Migration failed:', err);
        process.exit(1);
    }
})();
