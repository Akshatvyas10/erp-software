'use strict';
import { DataTypes } from 'sequelize'; // Trigger restart
import sequelize from '../config/database.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Timetable = sequelize.define('Timetable', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    classroomSubjectId: {
        type: DataTypes.UUID, allowNull: false, field: 'classroom_subject_id',
        references: { model: 'classroom_subjects', key: 'id' }, onDelete: 'CASCADE'
    },
    dayOfWeek: {
        type: DataTypes.STRING(10), allowNull: false, field: 'day_of_week',
        validate: { isIn: [DAYS] },
    },
    startTime: { type: DataTypes.TIME, allowNull: false, field: 'start_time' },
    endTime: { type: DataTypes.TIME, allowNull: false, field: 'end_time' },
}, {
    tableName: 'timetables',
    indexes: [
        { fields: ['classroom_subject_id'], name: 'idx_tt_csubj' },
        { fields: ['day_of_week'], name: 'idx_tt_day' },
    ],
    validate: {
        // Row-level: endTime must be after startTime
        endAfterStart() {
            if (this.startTime && this.endTime && this.endTime <= this.startTime) {
                throw new Error('end_time must be after start_time');
            }
        },
    },
    paranoid: false,
    timestamps: true,
});

export default Timetable;
