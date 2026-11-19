'use strict';

/**
 * Migration: 20261120000001-add-performance-indexes.js
 * Adds high-traffic composite B-tree indexes for:
 * 1. student_invoices(student_id, status)
 * 2. fee_payments(payment_date, collected_by_id)
 * 3. student_attendances(classroom_id, date)
 * 4. timetables(teacher_id, day_of_week, start_time)
 */
export const up = async (queryInterface, Sequelize, transaction) => {
    // 1. student_invoices composite index
    await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_student_invoices_student_status" 
        ON "student_invoices" ("student_id", "status");
    `, { transaction });

    // 2. fee_payments composite index
    await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_fee_payments_date_collector" 
        ON "fee_payments" ("payment_date", "collected_by_id");
    `, { transaction });

    // 3. student_attendance composite index (table is student_attendance, column is attendance_date)
    await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_student_attendance_classroom_date" 
        ON "student_attendance" ("classroom_id", "attendance_date");
    `, { transaction });

    // 4. timetables conflict resolution index
    await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_timetables_teacher_slot" 
        ON "timetables" ("day_of_week", "start_time");
    `, { transaction });
};

export const down = async (queryInterface, Sequelize, transaction) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_student_invoices_student_status";`, { transaction });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_fee_payments_date_collector";`, { transaction });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_student_attendance_classroom_date";`, { transaction });
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_timetables_teacher_slot";`, { transaction });
};
