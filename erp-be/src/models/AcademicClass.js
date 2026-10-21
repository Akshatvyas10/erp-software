'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AcademicClass = sequelize.define('AcademicClass', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    name: {
        type: DataTypes.STRING(80),
        allowNull: false,
        comment: 'e.g. Nursery, KG 1, Class 1, Class 10'
    },
    code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'Unique slug / code, e.g. NURSERY, CLASS_10'
    },
    orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'order_index',
        comment: 'Sort order for school progression'
    },
    departmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'department_id',
        references: { model: 'departments', key: 'id' },
        onDelete: 'SET NULL'
    },
    status: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE']] },
    },
}, {
    tableName: 'academic_classes',
    indexes: [
        { unique: true, fields: ['name'], name: 'unique_academic_class_name', where: { deleted_at: null } },
        { unique: true, fields: ['code'], name: 'unique_academic_class_code', where: { deleted_at: null } },
        { fields: ['order_index'], name: 'idx_academic_classes_order' }
    ],
});

export default AcademicClass;
