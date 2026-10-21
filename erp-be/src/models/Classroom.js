'use strict';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Classroom = sequelize.define('Classroom', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    classId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'class_id',
        references: { model: 'academic_classes', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'Parent Academic Class'
    },
    name: {
        type: DataTypes.STRING(80), allowNull: false,
        comment: 'e.g. Grade 10'
    },
    section: {
        type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G'),
        allowNull: false,
        defaultValue: 'A',
        comment: 'Classroom Section Enum A-G'
    },
    academicYear: {
        type: DataTypes.STRING(20), allowNull: false,
        field: 'academic_year', comment: 'e.g. 2024-25'
    },
    roomNumber: {
        type: DataTypes.STRING(20), allowNull: true,
        field: 'room_number'
    },
    classTeacherId: {
        type: DataTypes.UUID, allowNull: true, field: 'class_teacher_id',
        references: { model: 'teachers', key: 'id' }, onDelete: 'SET NULL'
    },
    department: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g. PRIMARY, MIDDLE, HIGH_SCHOOL'
    },
    departmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'department_id',
        references: { model: 'departments', key: 'id' },
        onDelete: 'SET NULL'
    },
    buildingBlock: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'building_block'
    },
    blockId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'block_id',
        references: { model: 'building_blocks', key: 'id' },
        onDelete: 'SET NULL'
    },
    roomId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'room_id',
        references: { model: 'classroom_rooms', key: 'id' },
        onDelete: 'SET NULL'
    },
    maxCapacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40,
        field: 'max_capacity'
    },
    monitorMaleId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'monitor_male_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'SET NULL'
    },
    monitorFemaleId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'monitor_female_id',
        references: { model: 'students', key: 'id' },
        onDelete: 'SET NULL'
    },
    status: {
        type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE']] },
    },
}, {
    tableName: 'classrooms',
    indexes: [
        { unique: true, fields: ['name', 'section', 'academic_year'], name: 'unique_classroom' },
        { unique: true, fields: ['class_teacher_id'], where: { status: 'ACTIVE' }, name: 'unique_class_teacher_active' },
        { fields: ['class_id'], name: 'idx_classrooms_class_id' },
    ],
});

export default Classroom;
