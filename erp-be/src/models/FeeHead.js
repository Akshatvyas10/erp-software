'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeeHead = sequelize.define('FeeHead', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isRefundable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_refundable',
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE']] },
    },
}, {
    tableName: 'fee_heads',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['code'],
            name: 'unique_fee_head_code',
            where: { deleted_at: null },
        },
    ],
});

export default FeeHead;

