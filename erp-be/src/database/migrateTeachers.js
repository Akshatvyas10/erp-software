'use strict';
import { DataTypes } from 'sequelize';
import db from '../models/index.js';

async function migrate() {
    try {
        const q = db.sequelize.getQueryInterface();
        const tableInfo = await q.describeTable('teachers');

        const colsToAdd = [
            { name: 'account_holder_name', type: DataTypes.STRING(150) },
            { name: 'bank_branch', type: DataTypes.STRING(100) },
            { name: 'current_address', type: DataTypes.TEXT },
            { name: 'permanent_address', type: DataTypes.TEXT },
            { name: 'profile_photo_url', type: DataTypes.STRING(255) },
            { name: 'emergency_contact_name', type: DataTypes.STRING(100) },
            { name: 'emergency_contact_phone', type: DataTypes.STRING(20) },
        ];

        for (const c of colsToAdd) {
            if (!tableInfo[c.name]) {
                console.log(`Adding column ${c.name} to teachers...`);
                await q.addColumn('teachers', c.name, { type: c.type, allowNull: true });
            } else {
                console.log(`Column ${c.name} already exists.`);
            }
        }

        await db.sequelize.query('CREATE SEQUENCE IF NOT EXISTS teacher_id_seq START WITH 10 INCREMENT BY 1');
        await db.sequelize.query('CREATE SEQUENCE IF NOT EXISTS employee_num_seq START WITH 10 INCREMENT BY 1');
        console.log('Teacher sequences created/verified successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
