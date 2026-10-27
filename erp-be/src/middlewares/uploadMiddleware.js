import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ─── Ensure upload directory exists ──────────────────────────────────────────
export const STUDENT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'students');
export const TEACHER_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'teachers');

if (!fs.existsSync(STUDENT_UPLOAD_DIR)) {
    fs.mkdirSync(STUDENT_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(TEACHER_UPLOAD_DIR)) {
    fs.mkdirSync(TEACHER_UPLOAD_DIR, { recursive: true });
}

// ─── DiskStorage: unique timestamped filenames ────────────────────────────────
const studentStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, STUDENT_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        cb(null, `stud-${timestamp}-${random}${ext}`);
    },
});

const teacherStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, TEACHER_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        cb(null, `tch-${timestamp}-${random}${ext}`);
    },
});

// ─── MIME-type filter: JPEG + PNG only ───────────────────────────────────────
const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            Object.assign(new Error('Only JPEG and PNG images are allowed'), {
                code: 'INVALID_FILE_TYPE',
            }),
            false
        );
    }
};

const studentUpload = multer({
    storage: studentStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const teacherUpload = multer({
    storage: teacherStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const uploadStudentPhoto = studentUpload.single('profilePhoto');
const uploadTeacherPhoto = teacherUpload.single('profilePhoto');

export const handleProfilePhotoUpload = (req, res, next) => {
    uploadStudentPhoto(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(422).json({ success: false, message: 'Profile photo must be under 2 MB' });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
            return res.status(422).json({ success: false, message: err.message });
        }
        next(err);
    });
};

export const handleTeacherPhotoUpload = (req, res, next) => {
    uploadTeacherPhoto(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(422).json({ success: false, message: 'Profile photo must be under 2 MB' });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
            return res.status(422).json({ success: false, message: err.message });
        }
        next(err);
    });
};

export const buildPhotoUrl = (filename) => `/uploads/students/${filename}`;
export const buildTeacherPhotoUrl = (filename) => `/uploads/teachers/${filename}`;

