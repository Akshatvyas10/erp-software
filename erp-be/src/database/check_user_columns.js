import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import db from '../models/index.js';

async function check() {
    const attrs = Object.keys(db.User.getAttributes());
    console.log("User attributes in Sequelize:", attrs.filter(a => ['gender', 'dob', 'phone', 'mfaEnabled'].includes(a)));
    
    // Check DB
    const [results] = await db.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name IN ('gender', 'dob', 'phone', 'mfa_enabled');
    `);
    console.log("Columns in DB:", results.map(r => r.column_name));
    process.exit(0);
}

check();
