'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeeStructureItem = sequelize.define('FeeStructureItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    feeStructureId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'fee_structure_id',
        references: { model: 'fee_structures', key: 'id' },
        onDelete: 'CASCADE',
    },
    feeHeadId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'fee_head_id',
        references: { model: 'fee_heads', key: 'id' },
        onDelete: 'RESTRICT',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: { min: 0 },
    },
    frequency: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'MONTHLY',
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_enabled',
    },
}, {
    tableName: 'fee_structure_items',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['fee_structure_id', 'fee_head_id', 'frequency'],
            name: 'unique_structure_head_frequency',
            where: { deleted_at: null },
        },
    ],
});

export default FeeStructureItem;

