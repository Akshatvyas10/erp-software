import 'dotenv/config';
import sequelize from './src/config/database.js';
import './src/models/index.js';

async function syncDb() {
    try {
        await sequelize.authenticate();
        console.log('Syncing database...');
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully');
    } catch (err) {
        console.error('Error syncing database:', err);
    } finally {
        await sequelize.close();
    }
}
syncDb();
