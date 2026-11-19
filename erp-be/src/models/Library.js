'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Book: Library catalog model
 */
export const Book = sequelize.define('Book', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    isbn: { type: DataTypes.STRING(30), allowNull: true, unique: true },
    barcode: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    author: { type: DataTypes.STRING(255), allowNull: false },
    publisher: { type: DataTypes.STRING(255), allowNull: true },
    edition: { type: DataTypes.STRING(50), allowNull: true },
    category: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'General' },
    totalCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    availableCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    shelfLocation: { type: DataTypes.STRING(100), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
    tableName: 'library_books',
    timestamps: true,
    underscored: true,
});

/**
 * BookIssue: Circulation and fine management model
 */
export const BookIssue = sequelize.define('BookIssue', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bookId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'library_books', key: 'id' },
        onDelete: 'RESTRICT',
    },
    memberType: { type: DataTypes.ENUM('STUDENT', 'TEACHER'), allowNull: false, defaultValue: 'STUDENT' },
    studentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'students', key: 'id' },
        onDelete: 'RESTRICT',
    },
    teacherId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'teachers', key: 'id' },
        onDelete: 'RESTRICT',
    },
    issueDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
    returnDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('ISSUED', 'RETURNED', 'OVERDUE', 'LOST'), defaultValue: 'ISSUED' },
    fineAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    finePaid: { type: DataTypes.BOOLEAN, defaultValue: false },
    issuedById: { type: DataTypes.UUID, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'library_book_issues',
    timestamps: true,
    underscored: true,
});

export default { Book, BookIssue };

