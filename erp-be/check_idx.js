require('dotenv').config();
const { sequelize } = require('./src/models');
async function run() {
    try {
        const [res] = await sequelize.query(`SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'classroom_students' AND constraint_type = 'UNIQUE'`);
        console.log("Constraints:", res);
        const [indexes] = await sequelize.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'classroom_students' AND indexdef LIKE '%UNIQUE%'`);
        console.log("Indexes:", indexes);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
