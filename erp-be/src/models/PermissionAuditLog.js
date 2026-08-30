'use strict';

import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
    class PermissionAuditLog extends Model {
        static associate(models) {
            PermissionAuditLog.belongsTo(models.User, { foreignKey: 'targetUserId', as: 'TargetUser' });
            PermissionAuditLog.belongsTo(models.User, { foreignKey: 'changedBy', as: 'AdminUser' });
        }
    }
    PermissionAuditLog.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            targetUserId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'target_user_id',
            },
            changedBy: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'changed_by',
            },
            action: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            oldPermissions: {
                type: DataTypes.JSONB,
                allowNull: true,
                field: 'old_permissions',
            },
            newPermissions: {
                type: DataTypes.JSONB,
                allowNull: true,
                field: 'new_permissions',
            },
        },
        {
            sequelize,
            modelName: 'PermissionAuditLog',
            tableName: 'permission_audit_log',
            timestamps: true,
            updatedAt: false,
        }
    );
    return PermissionAuditLog;
};
