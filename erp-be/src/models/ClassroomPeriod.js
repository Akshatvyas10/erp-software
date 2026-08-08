import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomPeriod = sequelize.define('ClassroomPeriod', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    classroomId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_id',
        references: { model: 'classrooms', key: 'id' }, onDelete: 'CASCADE'
    },
    name: {
        type: DataTypes.STRING(50), allowNull: false,
        comment: 'e.g. Lecture 1, Break, Period 2'
    },
    startTime: { type: DataTypes.TIME, allowNull: false, field: 'start_time' },
    endTime: { type: DataTypes.TIME, allowNull: false, field: 'end_time' },
    order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
    tableName: 'classroom_periods',
    indexes: [
        { fields: ['classroom_id'] },
    ],
    validate: {
        endAfterStart() {
            if (this.startTime && this.endTime && this.endTime <= this.startTime) {
                throw new Error('end_time must be after start_time');
            }
        },
    },
    paranoid: false,
    timestamps: true,
});

export default ClassroomPeriod;
