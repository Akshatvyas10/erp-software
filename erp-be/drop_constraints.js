require('dotenv').config();
const { sequelize } = require('./src/models');

async function main() {
    try {
        const [res] = await sequelize.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'timetables' AND constraint_type = 'UNIQUE'
        `);
        console.log("Found constraints:", res);
        
        for (const r of res) {
            console.log("Dropping", r.constraint_name);
            await sequelize.query(`ALTER TABLE timetables DROP CONSTRAINT "${r.constraint_name}"`);
        }

        const [indexes] = await sequelize.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'timetables' AND indexdef LIKE '%UNIQUE%'
        `);
        console.log("Found unique indexes:", indexes);
        for (const i of indexes) {
            if (!i.indexname.includes('pkey')) {
                console.log("Dropping index", i.indexname);
                await sequelize.query(`DROP INDEX "${i.indexname}"`);
            }
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

main();
