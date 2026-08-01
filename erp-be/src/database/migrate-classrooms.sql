-- =============================================================================
-- Classroom Management Schema — Neon DB (PostgreSQL)
-- Production-ready migration with FK-indexed constraints
-- Run order: classrooms → classroom_students → classroom_subjects → timetables
-- =============================================================================

-- Enable UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. STATUS ENUM ──────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'classroom_status') THEN
        CREATE TYPE classroom_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
END
$$;

-- ─── 2. DAY-OF-WEEK ENUM ─────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_of_week') THEN
        CREATE TYPE day_of_week AS ENUM (
            'Monday', 'Tuesday', 'Wednesday', 'Thursday',
            'Friday', 'Saturday', 'Sunday'
        );
    END IF;
END
$$;

-- =============================================================================
-- TABLE: classrooms
-- Base entity — one classroom per name/section/academic_year combination
-- =============================================================================
CREATE TABLE IF NOT EXISTS classrooms (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    name           VARCHAR(80)     NOT NULL,                        -- e.g. "Grade 10"
    section        VARCHAR(10)     NOT NULL,                        -- e.g. "A"
    academic_year  VARCHAR(20)     NOT NULL,                        -- e.g. "2024-25"
    room_number    VARCHAR(20)     NULL,
    status         classroom_status NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ     NULL,                            -- Sequelize paranoid soft-delete

    CONSTRAINT pk_classrooms PRIMARY KEY (id),
    CONSTRAINT uq_classroom_name_section_year
        UNIQUE (name, section, academic_year)
);

-- Partial index: fast lookups for ACTIVE classrooms only
CREATE INDEX IF NOT EXISTS idx_classrooms_status
    ON classrooms (status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_classrooms_academic_year
    ON classrooms (academic_year)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: classroom_students
-- Junction: maps students into classrooms (one student → one classroom per year)
-- =============================================================================
CREATE TABLE IF NOT EXISTS classroom_students (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    classroom_id  UUID        NOT NULL,
    student_id    UUID        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_classroom_students PRIMARY KEY (id),

    -- One student cannot be in the same classroom twice
    CONSTRAINT uq_classroom_student
        UNIQUE (classroom_id, student_id),

    CONSTRAINT fk_cs_classroom
        FOREIGN KEY (classroom_id)
        REFERENCES classrooms (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_cs_student
        FOREIGN KEY (student_id)
        REFERENCES students (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- FK indexes — critical for JOIN performance
CREATE INDEX IF NOT EXISTS idx_cs_classroom_id
    ON classroom_students (classroom_id);

CREATE INDEX IF NOT EXISTS idx_cs_student_id
    ON classroom_students (student_id);

-- =============================================================================
-- TABLE: classroom_subjects
-- Academic map: ties a subject + teacher assignment to a classroom
-- =============================================================================
CREATE TABLE IF NOT EXISTS classroom_subjects (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    classroom_id  UUID        NOT NULL,
    teacher_id    UUID        NULL,                                 -- nullable: teacher may be unassigned
    subject_name  VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_classroom_subjects PRIMARY KEY (id),

    -- Each subject can only appear once per classroom
    CONSTRAINT uq_classroom_subject
        UNIQUE (classroom_id, subject_name),

    CONSTRAINT fk_csubj_classroom
        FOREIGN KEY (classroom_id)
        REFERENCES classrooms (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_csubj_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES teachers (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_csubj_classroom_id
    ON classroom_subjects (classroom_id);

CREATE INDEX IF NOT EXISTS idx_csubj_teacher_id
    ON classroom_subjects (teacher_id);

-- =============================================================================
-- TABLE: timetables
-- Scheduling rows per classroom_subject; one slot per day/subject (upsert-safe)
-- =============================================================================
CREATE TABLE IF NOT EXISTS timetables (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    classroom_subject_id  UUID        NOT NULL,
    day_of_week           day_of_week NOT NULL,
    start_time            TIME        NOT NULL,
    end_time              TIME        NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_timetables PRIMARY KEY (id),

    -- Logical constraint: end must be after start
    CONSTRAINT chk_timetable_time_range
        CHECK (end_time > start_time),

    -- One slot per subject per day (prevents double-booking at the source)
    CONSTRAINT uq_timetable_subject_day
        UNIQUE (classroom_subject_id, day_of_week),

    CONSTRAINT fk_tt_classroom_subject
        FOREIGN KEY (classroom_subject_id)
        REFERENCES classroom_subjects (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tt_classroom_subject_id
    ON timetables (classroom_subject_id);

CREATE INDEX IF NOT EXISTS idx_tt_day_of_week
    ON timetables (day_of_week);

-- Composite index for the weekly view query pattern
CREATE INDEX IF NOT EXISTS idx_tt_subject_day_time
    ON timetables (classroom_subject_id, day_of_week, start_time);

-- =============================================================================
-- AUTO-UPDATE trigger: keeps updated_at current on every row change
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['classrooms','classroom_students','classroom_subjects','timetables']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || t || '_updated_at'
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
                t, t
            );
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- MIGRATION COMPLETE
-- Tables created: classrooms, classroom_students, classroom_subjects, timetables
-- Indexes: all FKs + partial/composite performance indexes
-- Constraints: PK, UQ, FK (CASCADE / SET NULL), CHECK (time range)
-- =============================================================================
