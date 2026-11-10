import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FeePaymentReversal = sequelize.define(
    'FeePaymentReversal',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        paymentId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            field: 'payment_id',
        },
        reversalReceiptNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'reversal_receipt_number',
        },
        reversedAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            field: 'reversed_amount',
        },
        bouncePenaltyAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
            field: 'bounce_penalty_amount',
        },
        reason: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        authorizedById: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'authorized_by_id',
        },
    },
    {
        tableName: 'fee_payment_reversals',
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);

export default FeePaymentReversal;

