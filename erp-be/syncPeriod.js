const { sequelize, ClassroomPeriod } = require('./src/models');
async function run() {
    await ClassroomPeriod.sync({ force: false });
    console.log('ClassroomPeriod table synced');
    process.exit(0);
}
run();
