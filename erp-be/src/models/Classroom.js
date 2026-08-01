'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Classroom = sequelize.define('Classroom', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    name: {
        type: DataTypes.STRING(80), allowNull: false,
        comment: 'e.g. Grade 10'
    },
    section: {
        type: DataTypes.STRING(10), allowNull: false,
        comment: 'e.g. A, B, C'
    },
    academicYear: {
        type: DataTypes.STRING(20), allowNull: false,
        field: 'academic_year', comment: 'e.g. 2024-25'
    },
    roomNumber: {
        type: DataTypes.STRING(20), allowNull: true,
        field: 'room_number'
    },
    status: {
        type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE']] },
    },
}, {
    tableName: 'classrooms',
    indexes: [
        { unique: true, fields: ['name', 'section', 'academic_year'], name: 'unique_classroom' },
    ],
});

module.exports = Classroom;
