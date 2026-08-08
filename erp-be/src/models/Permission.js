'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Permission = sequelize.define(
    'Permission',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: { notEmpty: true },
        },
        resource: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        action: {
            type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'manage'),
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        tableName: 'permissions',
    }
);

export default Permission;
