require('dotenv').config();
const { sequelize } = require('./src/models');

async function run() {
    try {
        // 1. Delete duplicate enrollments (keep the oldest one per academic year for each student)
        console.log("Cleaning up duplicate enrollments...");
        await sequelize.query(`
            DELETE FROM classroom_students
            WHERE id IN (
                SELECT cs.id
                FROM classroom_students cs
                JOIN classrooms c ON cs.classroom_id = c.id
                WHERE cs.id NOT IN (
                    SELECT DISTINCT ON (cs2.student_id, c2.academic_year) cs2.id
                    FROM classroom_students cs2
                    JOIN classrooms c2 ON cs2.classroom_id = c2.id
                    ORDER BY cs2.student_id, c2.academic_year, cs2.created_at ASC
                )
            )
        `);
        console.log("Cleanup done.");

        // 2. Create the trigger function
        console.log("Creating database trigger function...");
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION check_single_classroom_per_year()
            RETURNS TRIGGER AS $$
            DECLARE
                target_year VARCHAR;
                conflict_count INTEGER;
            BEGIN
                -- Get the academic year of the classroom being inserted/updated
                SELECT academic_year INTO target_year FROM classrooms WHERE id = NEW.classroom_id;
                
                -- Check if the student is already enrolled in another classroom in the SAME academic year
                SELECT COUNT(*) INTO conflict_count
                FROM classroom_students cs
                JOIN classrooms c ON cs.classroom_id = c.id
                WHERE cs.student_id = NEW.student_id
                  AND c.academic_year = target_year
                  AND cs.classroom_id != NEW.classroom_id;
                  
                IF conflict_count > 0 THEN
                    RAISE EXCEPTION 'Student is already enrolled in another classroom for academic year %', target_year;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 3. Create the trigger
        console.log("Creating trigger...");
        await sequelize.query(`DROP TRIGGER IF EXISTS trg_check_single_classroom_per_year ON classroom_students`);
        await sequelize.query(`
            CREATE TRIGGER trg_check_single_classroom_per_year
            BEFORE INSERT OR UPDATE ON classroom_students
            FOR EACH ROW
            EXECUTE FUNCTION check_single_classroom_per_year();
        `);
        
        console.log("Trigger created successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
