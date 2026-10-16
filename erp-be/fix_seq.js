import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const db = await import('./src/models/index.js');
        const sequelize = db.default.sequelize;
        
        // Find max sequence value safely using Regex substring (Postgres)
        const resUser = await sequelize.query(`
            SELECT setval('erp_user_id_seq', (
                SELECT COALESCE(MAX(CAST(SUBSTRING(user_id FROM '[0-9]+') AS INTEGER)), 0) + 1 
                FROM users
            ))
        `);
        console.log('User sequence updated:', resUser);

        const resStudent = await sequelize.query(`
            SELECT setval('erp_student_id_seq', (
                SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM '[0-9]+') AS INTEGER)), 0) + 1 
                FROM students
            ))
        `);
        console.log('Student sequence updated:', resStudent);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
