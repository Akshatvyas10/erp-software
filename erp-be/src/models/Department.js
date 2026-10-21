import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Department = sequelize.define('Department', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },

    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },

    headId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'teachers',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Teacher ID who is the Department Incharge (Head of Department)'
    }
}, { tableName: 'departments' });

export default Department;
