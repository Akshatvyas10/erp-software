'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * HostelBlock: Building block or wing in campus dormitory
 */
export const HostelBlock = sequelize.define('HostelBlock', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    genderType: { type: DataTypes.ENUM('BOYS', 'GIRLS', 'COED'), defaultValue: 'BOYS' },
    wardenName: { type: DataTypes.STRING(100), allowNull: false },
    wardenPhone: { type: DataTypes.STRING(20), allowNull: false },
    totalRooms: { type: DataTypes.INTEGER, defaultValue: 20 },
    description: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'hostel_blocks',
    timestamps: true,
    underscored: true,
});

/**
 * HostelRoom: Individual room within a block
 */
export const HostelRoom = sequelize.define('HostelRoom', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    blockId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hostel_blocks', key: 'id' },
        onDelete: 'CASCADE',
    },
    roomNumber: { type: DataTypes.STRING(30), allowNull: false },
    roomType: { type: DataTypes.ENUM('SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY'), defaultValue: 'DOUBLE' },
    bedCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    occupiedBeds: { type: DataTypes.INTEGER, defaultValue: 0 },
    monthlyFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    status: { type: DataTypes.ENUM('AVAILABLE', 'FULL', 'MAINTENANCE'), defaultValue: 'AVAILABLE' },
}, {
    tableName: 'hostel_rooms',
    timestamps: true,
    underscored: true,
});

export default { HostelBlock, HostelRoom };

