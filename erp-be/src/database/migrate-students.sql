-- =============================================================================
-- Student Management Schema — Neon DB (PostgreSQL)
-- Production-ready migration: enums, students table, permission seeding
-- Run AFTER the base users/roles/permissions tables exist
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. STUDENT STATUS ENUM ───────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
        CREATE TYPE student_status AS ENUM (
            'ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED'
        );
    END IF;
END
$$;

-- ─── 2. TRANSPORT MODE ENUM ───────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_mode') THEN
        CREATE TYPE transport_mode AS ENUM (
            'SCHOOL_BUS', 'PRIVATE_TRANSPORT', 'WALKER'
        );
    END IF;
END
$$;

-- ─── 3. FEE QUOTA ENUM ────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_quota') THEN
        CREATE TYPE fee_quota AS ENUM (
            'REGULAR', 'STAFF_CHILD', 'SCHOLARSHIP_HALF', 'SCHOLARSHIP_FULL'
        );
    END IF;
END
$$;

-- =============================================================================
-- TABLE: students
-- Extends `users` with a rich student profile. Strict 1:1 via user_id FK.
-- =============================================================================
DO $$
BEGIN
    -- Only alter the table if it already exists (from a prior minimal migration)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN

        -- Add new columns only if they don't already exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='admission_number') THEN
            ALTER TABLE students ADD COLUMN admission_number VARCHAR(30) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='roll_number') THEN
            ALTER TABLE students ADD COLUMN roll_number VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='government_id') THEN
            ALTER TABLE students ADD COLUMN government_id VARCHAR(50) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='gender') THEN
            ALTER TABLE students ADD COLUMN gender VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='blood_group') THEN
            ALTER TABLE students ADD COLUMN blood_group VARCHAR(5);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='medical_notes') THEN
            ALTER TABLE students ADD COLUMN medical_notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='permanent_address') THEN
            ALTER TABLE students ADD COLUMN permanent_address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='current_address') THEN
            ALTER TABLE students ADD COLUMN current_address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='transportation_mode') THEN
            ALTER TABLE students ADD COLUMN transportation_mode transport_mode DEFAULT 'WALKER';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='guardian_relationship') THEN
            ALTER TABLE students ADD COLUMN guardian_relationship VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='guardian_email') THEN
            ALTER TABLE students ADD COLUMN guardian_email VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='fee_quota') THEN
            ALTER TABLE students ADD COLUMN fee_quota fee_quota NOT NULL DEFAULT 'REGULAR';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='previous_school_details') THEN
            ALTER TABLE students ADD COLUMN previous_school_details TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='transfer_certificate_url') THEN
            ALTER TABLE students ADD COLUMN transfer_certificate_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='status') THEN
            ALTER TABLE students ADD COLUMN status student_status NOT NULL DEFAULT 'ACTIVE';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='profile_photo_url') THEN
            ALTER TABLE students ADD COLUMN profile_photo_url TEXT;
        END IF;

    ELSE
        -- Full table creation if it doesn't exist yet
        CREATE TABLE students (
            id                       UUID            NOT NULL DEFAULT gen_random_uuid(),
            user_id                  UUID            NOT NULL,
            student_id               VARCHAR(20)     NOT NULL,
            enrollment_number        VARCHAR(50)     UNIQUE,
            admission_number         VARCHAR(30)     UNIQUE,
            roll_number              VARCHAR(20),
            grade                    VARCHAR(20),
            section                  VARCHAR(10),
            date_of_birth            DATE,
            gender                   VARCHAR(20),
            blood_group              VARCHAR(5),
            medical_notes            TEXT,
            permanent_address        TEXT,
            current_address          TEXT,
            transportation_mode      transport_mode  DEFAULT 'WALKER',
            guardian_name            VARCHAR(200),
            guardian_relationship    VARCHAR(50),
            guardian_phone           VARCHAR(20),
            guardian_email           VARCHAR(255),
            fee_quota                fee_quota       NOT NULL DEFAULT 'REGULAR',
            previous_school_details  TEXT,
            transfer_certificate_url TEXT,
            profile_photo_url        TEXT,
            status                   student_status  NOT NULL DEFAULT 'ACTIVE',
            created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
            updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
            deleted_at               TIMESTAMPTZ,

            CONSTRAINT pk_students PRIMARY KEY (id),
            CONSTRAINT uq_students_user_id   UNIQUE (user_id),
            CONSTRAINT uq_students_id        UNIQUE (student_id),

            CONSTRAINT fk_students_user
                FOREIGN KEY (user_id)
                REFERENCES users (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        );
    END IF;
END
$$;

-- ─── PERFORMANCE INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_user_id
    ON students (user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_admission_number
    ON students (admission_number)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_status
    ON students (status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_student_id
    ON students (student_id)
    WHERE deleted_at IS NULL;

-- ─── AUTO-UPDATE TRIGGER ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_students_updated_at'
    ) THEN
        CREATE TRIGGER trg_students_updated_at
            BEFORE UPDATE ON students
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- =============================================================================
-- PERMISSION SEEDING
-- Ensure student CRUD permissions exist and are assigned to admin / teacher roles
-- =============================================================================

-- Upsert permissions
INSERT INTO permissions (id, name, resource, action, description, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'students:read',   'students', 'read',   'View students',            NOW(), NOW()),
    (gen_random_uuid(), 'students:create', 'students', 'create', 'Enroll new students',       NOW(), NOW()),
    (gen_random_uuid(), 'students:update', 'students', 'update', 'Update student records',    NOW(), NOW()),
    (gen_random_uuid(), 'students:delete', 'students', 'delete', 'Remove student records',    NOW(), NOW()),
    (gen_random_uuid(), 'students:manage', 'students', 'manage', 'Full student management',   NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Assign students:manage to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'students:manage'
ON CONFLICT DO NOTHING;

-- Assign students:read to teacher role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teacher' AND p.name = 'students:read'
ON CONFLICT DO NOTHING;

-- Assign students:read to student role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'student' AND p.name = 'students:read'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- New enums: student_status, transport_mode, fee_quota
-- students table: fully extended with all profile fields
-- Indexes: user_id, admission_number, status, student_id
-- Permissions: students:read/create/update/delete/manage seeded & role-assigned
-- =============================================================================
