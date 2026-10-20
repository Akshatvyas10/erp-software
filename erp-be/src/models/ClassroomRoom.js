'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomRoom = sequelize.define('ClassroomRoom', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    blockId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'block_id',
        references: {
            model: 'building_blocks',
            key: 'id'
        },
        onDelete: 'CASCADE',
    },
    roomNumber: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'room_number',
        comment: 'e.g. 101, Lab-2'
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40,
    },
    roomType: {
        type: DataTypes.ENUM('CLASSROOM', 'LAB', 'LIBRARY', 'AUDITORIUM', 'ACTIVITY_ROOM'),
        defaultValue: 'CLASSROOM',
        field: 'room_type',
        allowNull: false,
    },
    floor: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'Ground Floor',
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE',
        allowNull: false,
    }
}, {
    tableName: 'classroom_rooms',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['block_id', 'room_number'],
            name: 'unique_block_room_number'
        }
    ]
});

export default ClassroomRoom;
