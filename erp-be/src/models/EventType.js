import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const EventType = sequelize.define('EventType', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    is_leave_day: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    tableName: 'event_types',
    timestamps: true,
});

export default EventType;
