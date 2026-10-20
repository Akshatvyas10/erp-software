'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BuildingBlock = sequelize.define('BuildingBlock', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'e.g. Science Block, Main Wing, A-Block'
    },
    code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        comment: 'e.g. BLK-A, SCI-BLK'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE',
        allowNull: false,
    }
}, {
    tableName: 'building_blocks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default BuildingBlock;
