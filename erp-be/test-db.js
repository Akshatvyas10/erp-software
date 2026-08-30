import 'dotenv/config';
import sequelize from './src/config/database.js';
import CalendarEvent from './src/models/CalendarEvent.js';
import User from './src/models/User.js';
import Classroom from './src/models/Classroom.js';
import './src/models/index.js';

async function test() {
    try {
        await sequelize.authenticate();
        await CalendarEvent.findAll({
            include: [
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: Classroom, as: 'targetClass', attributes: ['id', 'name', 'section', 'academicYear'] }
            ],
            order: [['start_date', 'ASC']]
        });
        console.log('Success');
    } catch (err) {
        console.error('Error Details:', err);
    } finally {
        await sequelize.close();
    }
}
test();
