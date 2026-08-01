'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Ensure upload directory exists ──────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'students');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── DiskStorage: unique timestamped filenames ────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        cb(null, `stud-${timestamp}-${random}${ext}`);
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

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1 * 1024 * 1024, // 1 MB hard cap
    },
});

/**
 * Single optional profile photo upload on field "profilePhoto".
 * Passes through cleanly when no file is attached (multipart or JSON).
 */
const uploadProfilePhoto = upload.single('profilePhoto');

/**
 * Express error-normalising wrapper.
 * Converts Multer errors into consistent { success:false } API responses
 * so the global error handler does not need to know about Multer specifics.
 */
const handleProfilePhotoUpload = (req, res, next) => {
    uploadProfilePhoto(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(422).json({
                success: false,
                message: 'Profile photo must be under 1 MB',
            });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
            return res.status(422).json({
                success: false,
                message: err.message,
            });
        }
        // Unexpected multer error — let global handler deal with it
        next(err);
    });
};

/**
 * Build the relative public URL stored in the DB.
 * e.g. /uploads/students/stud-1710920001234-0042.jpg
 */
const buildPhotoUrl = (filename) =>
    `/uploads/students/${filename}`;

module.exports = { handleProfilePhotoUpload, buildPhotoUrl, UPLOAD_DIR };
