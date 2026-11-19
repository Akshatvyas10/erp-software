'use strict';

/**
 * Migration: 20261120000002-create-campus-extensions.js
 * Creates database tables for campus auxiliary facilities:
 * 1. library_books, library_book_issues
 * 2. transport_vehicles, transport_routes
 * 3. hostel_blocks, hostel_rooms
 * 4. inventory_items, expense_vouchers
 */
export const up = async (queryInterface, Sequelize, transaction) => {
    // 1. Library Tables
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "library_books" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "isbn" VARCHAR(30) UNIQUE,
            "barcode" VARCHAR(50) UNIQUE,
            "title" VARCHAR(255) NOT NULL,
            "author" VARCHAR(255) NOT NULL,
            "publisher" VARCHAR(255),
            "edition" VARCHAR(50),
            "category" VARCHAR(100) NOT NULL DEFAULT 'General',
            "total_copies" INTEGER NOT NULL DEFAULT 1,
            "available_copies" INTEGER NOT NULL DEFAULT 1,
            "shelf_location" VARCHAR(100),
            "is_active" BOOLEAN DEFAULT true,
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "library_book_issues" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "book_id" UUID NOT NULL REFERENCES "library_books"("id") ON DELETE RESTRICT,
            "member_type" VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
            "student_id" UUID REFERENCES "students"("id") ON DELETE RESTRICT,
            "teacher_id" UUID REFERENCES "teachers"("id") ON DELETE RESTRICT,
            "issue_date" DATE NOT NULL DEFAULT CURRENT_DATE,
            "due_date" DATE NOT NULL,
            "return_date" DATE,
            "status" VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
            "fine_amount" DECIMAL(10, 2) DEFAULT 0.00,
            "fine_paid" BOOLEAN DEFAULT false,
            "issued_by_id" UUID,
            "notes" TEXT,
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    // 2. Transport Tables
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "transport_vehicles" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "vehicle_number" VARCHAR(50) NOT NULL UNIQUE,
            "vehicle_type" VARCHAR(30) DEFAULT 'BUS',
            "capacity" INTEGER NOT NULL DEFAULT 40,
            "driver_name" VARCHAR(100) NOT NULL,
            "driver_phone" VARCHAR(20) NOT NULL,
            "driver_license_number" VARCHAR(50),
            "helper_name" VARCHAR(100),
            "helper_phone" VARCHAR(20),
            "gps_tracking_device_id" VARCHAR(100),
            "status" VARCHAR(30) DEFAULT 'ACTIVE',
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "transport_routes" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "route_name" VARCHAR(100) NOT NULL,
            "start_point" VARCHAR(150) NOT NULL,
            "end_point" VARCHAR(150) NOT NULL,
            "vehicle_id" UUID REFERENCES "transport_vehicles"("id") ON DELETE SET NULL,
            "monthly_fare" DECIMAL(10, 2) DEFAULT 0.00,
            "stops_json" JSONB DEFAULT '[]'::jsonb,
            "status" VARCHAR(30) DEFAULT 'ACTIVE',
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    // 3. Hostel Tables
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "hostel_blocks" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" VARCHAR(100) NOT NULL,
            "gender_type" VARCHAR(20) DEFAULT 'BOYS',
            "warden_name" VARCHAR(100) NOT NULL,
            "warden_phone" VARCHAR(20) NOT NULL,
            "total_rooms" INTEGER DEFAULT 20,
            "description" TEXT,
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "hostel_rooms" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "block_id" UUID NOT NULL REFERENCES "hostel_blocks"("id") ON DELETE CASCADE,
            "room_number" VARCHAR(30) NOT NULL,
            "room_type" VARCHAR(30) DEFAULT 'DOUBLE',
            "bed_capacity" INTEGER NOT NULL DEFAULT 2,
            "occupied_beds" INTEGER DEFAULT 0,
            "monthly_fee" DECIMAL(10, 2) DEFAULT 0.00,
            "status" VARCHAR(30) DEFAULT 'AVAILABLE',
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    // 4. Inventory & Expense Tables
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "inventory_items" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "item_code" VARCHAR(50) NOT NULL UNIQUE,
            "name" VARCHAR(150) NOT NULL,
            "category" VARCHAR(100) NOT NULL DEFAULT 'Stationery',
            "unit_of_measure" VARCHAR(30) DEFAULT 'PIECE',
            "current_quantity" INTEGER NOT NULL DEFAULT 0,
            "reorder_level" INTEGER DEFAULT 10,
            "unit_price" DECIMAL(10, 2) DEFAULT 0.00,
            "location" VARCHAR(100),
            "status" VARCHAR(30) DEFAULT 'IN_STOCK',
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });

    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "expense_vouchers" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "voucher_number" VARCHAR(50) NOT NULL UNIQUE,
            "category" VARCHAR(100) NOT NULL,
            "amount" DECIMAL(12, 2) NOT NULL,
            "payment_mode" VARCHAR(30) DEFAULT 'BANK_TRANSFER',
            "expense_date" DATE NOT NULL DEFAULT CURRENT_DATE,
            "vendor_name" VARCHAR(150),
            "paid_to" VARCHAR(150) NOT NULL,
            "description" TEXT NOT NULL,
            "approved_by_id" UUID,
            "receipt_attachment_url" VARCHAR(255),
            "status" VARCHAR(30) DEFAULT 'APPROVED',
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `, { transaction });
};

export const down = async (queryInterface, Sequelize, transaction) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "expense_vouchers";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "inventory_items";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "hostel_rooms";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "hostel_blocks";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "transport_routes";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "transport_vehicles";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "library_book_issues";`, { transaction });
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "library_books";`, { transaction });
};

