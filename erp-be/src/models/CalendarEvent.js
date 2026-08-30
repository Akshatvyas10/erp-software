import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CalendarEvent = sequelize.define('CalendarEvent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'EVENT'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    day_type: {
        type: DataTypes.ENUM('FULL_DAY', 'HALF_DAY', 'HOLIDAY', 'SPECIAL'),
        defaultValue: 'FULL_DAY',
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'CANCELLED'),
        defaultValue: 'DRAFT',
        allowNull: false
    },
    target_audience: {
        type: DataTypes.ENUM('ALL', 'STAFF', 'STUDENTS', 'CLASS'),
        defaultValue: 'ALL',
        allowNull: false
    },
    target_class_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'classrooms',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    is_auto_generated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    tableName: 'calendar_events',
    timestamps: true,
    paranoid: true, // soft deletes via deletedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
        {
            fields: ['type']
        },
        {
            fields: ['status']
        },
        {
            fields: ['start_date', 'end_date']
        }
    ]
});

export default CalendarEvent;
