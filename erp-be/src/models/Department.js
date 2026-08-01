'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
        onDelete: 'SET NULL'
    }
}, { tableName: 'departments' });

module.exports = Department;
