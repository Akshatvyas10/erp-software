'use strict';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Vehicle: School bus, van, or transport carrier
 */
export const Vehicle = sequelize.define('Vehicle', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    vehicleNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    vehicleType: { type: DataTypes.ENUM('BUS', 'VAN', 'MINIBUS'), defaultValue: 'BUS' },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 40 },
    driverName: { type: DataTypes.STRING(100), allowNull: false },
    driverPhone: { type: DataTypes.STRING(20), allowNull: false },
    driverLicenseNumber: { type: DataTypes.STRING(50), allowNull: true },
    helperName: { type: DataTypes.STRING(100), allowNull: true },
    helperPhone: { type: DataTypes.STRING(20), allowNull: true },
    gpsTrackingDeviceId: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'MAINTENANCE', 'INACTIVE'), defaultValue: 'ACTIVE' },
}, {
    tableName: 'transport_vehicles',
    timestamps: true,
    underscored: true,
});

/**
 * TransportRoute: Bus routes with stops and scheduled timings
 */
export const TransportRoute = sequelize.define('TransportRoute', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    routeName: { type: DataTypes.STRING(100), allowNull: false },
    startPoint: { type: DataTypes.STRING(150), allowNull: false },
    endPoint: { type: DataTypes.STRING(150), allowNull: false },
    vehicleId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'transport_vehicles', key: 'id' },
        onDelete: 'SET NULL',
    },
    monthlyFare: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    stopsJson: { type: DataTypes.JSONB, defaultValue: [] },
    status: { type: DataTypes.ENUM('ACTIVE', 'SUSPENDED'), defaultValue: 'ACTIVE' },
}, {
    tableName: 'transport_routes',
    timestamps: true,
    underscored: true,
});

export default { Vehicle, TransportRoute };

