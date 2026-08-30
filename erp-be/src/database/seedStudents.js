import 'dotenv/config';
import db from '../models/index.js';

const { sequelize, Role, User, Student } = db;

const MOCK_FIRST_NAMES = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Ananya", "Diya", "Kavya", "Isha", "Riya", "Rohan", "Krishna", "Om", "Meera", "Neha", "Rahul", "Karan", "Sneha", "Pooja", "Vikram"];
const MOCK_LAST_NAMES = ["Sharma", "Patel", "Reddy", "Singh", "Kumar", "Rao", "Das", "Gupta", "Nair", "Jain", "Bose", "Menon", "Iyer", "Chopra", "Kaur", "Desai", "Verma", "Malhotra", "Mehta", "Bhat"];

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const studentRole = await Role.findOne({ where: { name: 'student' } });
        if (!studentRole) {
            console.error('Student role not found. Make sure roles are seeded.');
            process.exit(1);
        }

        for (let i = 0; i < 20; i++) {
            const firstName = MOCK_FIRST_NAMES[i % MOCK_FIRST_NAMES.length];
            const lastName = MOCK_LAST_NAMES[i % MOCK_LAST_NAMES.length];
            const ts = Date.now() + i;
            
            const user = await User.create({
                userId: `ERP-STU-${ts.toString().slice(-6)}`,
                email: `stu_${ts}@school.edu`,
                password: 'Password123!',
                firstName,
                lastName,
                gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
                isActive: true
            });

            await user.addRole(studentRole);

            await Student.create({
                userId: user.id,
                studentId: `STU-${ts.toString().slice(-6)}`,
                admissionNumber: `ADM-${ts}`,
                rollNumber: `${i + 1}`,
                status: 'ACTIVE',
            });

            console.log(`Created student: ${firstName} ${lastName} (STU-${ts.toString().slice(-6)})`);
        }
        
        console.log('Successfully seeded 20 dummy students (without classrooms).');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
